-- Escrow Milestones Schema
-- Adds milestone-based escrow functionality for phased releases

-- Create escrow milestones table
CREATE TABLE IF NOT EXISTS escrow_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  escrow_id UUID NOT NULL REFERENCES escrows(id) ON DELETE CASCADE,

  -- Milestone details
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  percentage DECIMAL(5, 2) NOT NULL, -- Percentage of total escrow amount
  sequence_order INTEGER NOT NULL DEFAULT 1,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, released

  -- Approval workflow
  requires_buyer_approval BOOLEAN DEFAULT true,
  buyer_approved_at TIMESTAMP WITH TIME ZONE,
  buyer_approval_notes TEXT,

  requires_seller_approval BOOLEAN DEFAULT false,
  seller_approved_at TIMESTAMP WITH TIME ZONE,
  seller_approval_notes TEXT,

  -- Release tracking
  released_at TIMESTAMP WITH TIME ZONE,
  released_amount DECIMAL(15, 2),
  transaction_id UUID REFERENCES transactions(id),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_percentage CHECK (percentage > 0 AND percentage <= 100),
  CONSTRAINT valid_amount CHECK (amount > 0),
  CONSTRAINT valid_sequence CHECK (sequence_order > 0)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_escrow_milestones_escrow_id ON escrow_milestones(escrow_id);
CREATE INDEX IF NOT EXISTS idx_escrow_milestones_status ON escrow_milestones(status);

-- Create milestone evidence/attachments table
CREATE TABLE IF NOT EXISTS milestone_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  milestone_id UUID NOT NULL REFERENCES escrow_milestones(id) ON DELETE CASCADE,

  -- Evidence details
  uploaded_by UUID NOT NULL, -- User ID (buyer or seller)
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,

  -- Description
  description TEXT,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestone_evidence_milestone_id ON milestone_evidence(milestone_id);

-- Add milestone support columns to escrows table
ALTER TABLE escrows
ADD COLUMN IF NOT EXISTS has_milestones BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_release_milestones BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS milestone_release_delay_hours INTEGER DEFAULT 0;

-- Function: Calculate total milestone percentages
CREATE OR REPLACE FUNCTION validate_milestone_percentages(p_escrow_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_percentage DECIMAL(5, 2);
BEGIN
  SELECT COALESCE(SUM(percentage), 0)
  INTO v_total_percentage
  FROM escrow_milestones
  WHERE escrow_id = p_escrow_id;

  -- Allow exactly 100% or 0% (no milestones yet)
  RETURN v_total_percentage = 100 OR v_total_percentage = 0;
END;
$$ LANGUAGE plpgsql;

-- Function: Create milestone
CREATE OR REPLACE FUNCTION create_escrow_milestone(
  p_escrow_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_percentage DECIMAL,
  p_sequence_order INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_milestone_id UUID;
  v_escrow_amount DECIMAL(15, 2);
  v_milestone_amount DECIMAL(15, 2);
  v_next_sequence INTEGER;
BEGIN
  -- Get escrow amount
  SELECT amount INTO v_escrow_amount
  FROM escrows
  WHERE id = p_escrow_id;

  IF v_escrow_amount IS NULL THEN
    RAISE EXCEPTION 'Escrow not found';
  END IF;

  -- Calculate milestone amount
  v_milestone_amount := v_escrow_amount * (p_percentage / 100);

  -- Get next sequence order if not provided
  IF p_sequence_order IS NULL THEN
    SELECT COALESCE(MAX(sequence_order), 0) + 1
    INTO v_next_sequence
    FROM escrow_milestones
    WHERE escrow_id = p_escrow_id;
  ELSE
    v_next_sequence := p_sequence_order;
  END IF;

  -- Create milestone
  INSERT INTO escrow_milestones (
    escrow_id,
    title,
    description,
    amount,
    percentage,
    sequence_order,
    status
  ) VALUES (
    p_escrow_id,
    p_title,
    p_description,
    v_milestone_amount,
    p_percentage,
    v_next_sequence,
    'pending'
  )
  RETURNING id INTO v_milestone_id;

  -- Update escrow to indicate it has milestones
  UPDATE escrows
  SET has_milestones = true
  WHERE id = p_escrow_id;

  RETURN v_milestone_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Approve milestone (buyer or seller)
CREATE OR REPLACE FUNCTION approve_milestone(
  p_milestone_id UUID,
  p_user_id UUID,
  p_approval_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_escrow RECORD;
  v_milestone RECORD;
  v_is_buyer BOOLEAN;
  v_ready_to_release BOOLEAN := false;
BEGIN
  -- Get milestone and escrow details
  SELECT
    m.*,
    e.buyer_id,
    e.seller_id,
    e.status as escrow_status
  INTO v_milestone
  FROM escrow_milestones m
  JOIN escrows e ON m.escrow_id = e.id
  WHERE m.id = p_milestone_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  -- Check if user is buyer or seller
  v_is_buyer := (v_milestone.buyer_id = p_user_id);

  IF NOT v_is_buyer AND v_milestone.seller_id != p_user_id THEN
    RAISE EXCEPTION 'User is not authorized to approve this milestone';
  END IF;

  -- Update approval based on user role
  IF v_is_buyer THEN
    UPDATE escrow_milestones
    SET
      buyer_approved_at = NOW(),
      buyer_approval_notes = p_approval_notes,
      updated_at = NOW()
    WHERE id = p_milestone_id;
  ELSE
    UPDATE escrow_milestones
    SET
      seller_approved_at = NOW(),
      seller_approval_notes = p_approval_notes,
      updated_at = NOW()
    WHERE id = p_milestone_id;
  END IF;

  -- Check if all required approvals are complete
  SELECT
    (NOT requires_buyer_approval OR buyer_approved_at IS NOT NULL) AND
    (NOT requires_seller_approval OR seller_approved_at IS NOT NULL)
  INTO v_ready_to_release
  FROM escrow_milestones
  WHERE id = p_milestone_id;

  -- Update status to approved if all approvals are in
  IF v_ready_to_release THEN
    UPDATE escrow_milestones
    SET
      status = 'approved',
      updated_at = NOW()
    WHERE id = p_milestone_id;
  END IF;

  RETURN v_ready_to_release;
END;
$$ LANGUAGE plpgsql;

-- Function: Release milestone funds
CREATE OR REPLACE FUNCTION release_milestone(
  p_milestone_id UUID,
  p_released_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_milestone RECORD;
  v_escrow RECORD;
  v_transaction_id UUID;
BEGIN
  -- Get milestone and escrow details
  SELECT
    m.*,
    e.buyer_id,
    e.seller_id,
    e.currency,
    e.platform_fee_percentage
  INTO v_milestone
  FROM escrow_milestones m
  JOIN escrows e ON m.escrow_id = e.id
  WHERE m.id = p_milestone_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  -- Verify milestone is approved
  IF v_milestone.status != 'approved' THEN
    RAISE EXCEPTION 'Milestone must be approved before release';
  END IF;

  -- Verify not already released
  IF v_milestone.released_at IS NOT NULL THEN
    RAISE EXCEPTION 'Milestone already released';
  END IF;

  -- Calculate platform fee
  DECLARE
    v_platform_fee DECIMAL(15, 2);
    v_net_amount DECIMAL(15, 2);
  BEGIN
    v_platform_fee := v_milestone.amount * (v_milestone.platform_fee_percentage / 100);
    v_net_amount := v_milestone.amount - v_platform_fee;

    -- Create transaction for milestone release
    INSERT INTO transactions (
      user_id,
      type,
      amount,
      currency,
      status,
      description,
      metadata
    ) VALUES (
      v_milestone.seller_id,
      'escrow_release',
      v_net_amount,
      v_milestone.currency,
      'completed',
      'Escrow milestone release: ' || v_milestone.title,
      jsonb_build_object(
        'escrow_id', v_milestone.escrow_id,
        'milestone_id', v_milestone.id,
        'milestone_title', v_milestone.title,
        'gross_amount', v_milestone.amount,
        'platform_fee', v_platform_fee,
        'net_amount', v_net_amount
      )
    )
    RETURNING id INTO v_transaction_id;

    -- Update seller wallet
    UPDATE user_wallets
    SET
      balance = balance + v_net_amount,
      updated_at = NOW()
    WHERE user_id = v_milestone.seller_id AND currency = v_milestone.currency;

    -- Update milestone as released
    UPDATE escrow_milestones
    SET
      status = 'released',
      released_at = NOW(),
      released_amount = v_net_amount,
      transaction_id = v_transaction_id,
      updated_at = NOW()
    WHERE id = p_milestone_id;

    -- Check if all milestones are released
    DECLARE
      v_all_released BOOLEAN;
    BEGIN
      SELECT NOT EXISTS (
        SELECT 1 FROM escrow_milestones
        WHERE escrow_id = v_milestone.escrow_id
        AND status != 'released'
      ) INTO v_all_released;

      -- If all milestones released, mark escrow as completed
      IF v_all_released THEN
        UPDATE escrows
        SET
          status = 'completed',
          updated_at = NOW()
        WHERE id = v_milestone.escrow_id;
      END IF;
    END;

    RETURN v_transaction_id;
  END;
END;
$$ LANGUAGE plpgsql;

-- Function: Reject milestone
CREATE OR REPLACE FUNCTION reject_milestone(
  p_milestone_id UUID,
  p_user_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_milestone RECORD;
BEGIN
  -- Get milestone details
  SELECT
    m.*,
    e.buyer_id,
    e.seller_id
  INTO v_milestone
  FROM escrow_milestones m
  JOIN escrows e ON m.escrow_id = e.id
  WHERE m.id = p_milestone_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Milestone not found';
  END IF;

  -- Verify user is buyer (only buyer can reject)
  IF v_milestone.buyer_id != p_user_id THEN
    RAISE EXCEPTION 'Only the buyer can reject milestones';
  END IF;

  -- Update milestone status
  UPDATE escrow_milestones
  SET
    status = 'rejected',
    buyer_approval_notes = p_rejection_reason,
    updated_at = NOW()
  WHERE id = p_milestone_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for escrow_milestones
ALTER TABLE escrow_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones for their escrows"
  ON escrow_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM escrows e
      WHERE e.id = escrow_milestones.escrow_id
      AND (e.buyer_id = auth.uid() OR e.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert milestones for their escrows"
  ON escrow_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM escrows e
      WHERE e.id = escrow_milestones.escrow_id
      AND (e.buyer_id = auth.uid() OR e.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can update milestones for their escrows"
  ON escrow_milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM escrows e
      WHERE e.id = escrow_milestones.escrow_id
      AND (e.buyer_id = auth.uid() OR e.seller_id = auth.uid())
    )
  );

-- RLS Policies for milestone_evidence
ALTER TABLE milestone_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidence for their milestones"
  ON milestone_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM escrow_milestones m
      JOIN escrows e ON m.escrow_id = e.id
      WHERE m.id = milestone_evidence.milestone_id
      AND (e.buyer_id = auth.uid() OR e.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload evidence for their milestones"
  ON milestone_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM escrow_milestones m
      JOIN escrows e ON m.escrow_id = e.id
      WHERE m.id = milestone_evidence.milestone_id
      AND (e.buyer_id = auth.uid() OR e.seller_id = auth.uid())
    )
  );

-- Comments
COMMENT ON TABLE escrow_milestones IS 'Milestone-based escrow releases for phased payment delivery';
COMMENT ON TABLE milestone_evidence IS 'Evidence and attachments uploaded for milestone verification';
COMMENT ON FUNCTION create_escrow_milestone IS 'Creates a new milestone for an escrow with percentage-based amount calculation';
COMMENT ON FUNCTION approve_milestone IS 'Approves a milestone (buyer or seller approval)';
COMMENT ON FUNCTION release_milestone IS 'Releases milestone funds to seller after approval';
COMMENT ON FUNCTION reject_milestone IS 'Rejects a milestone (buyer only)';
