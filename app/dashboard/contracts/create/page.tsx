'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useTheme } from '@/contexts/ThemeContext'
import { useSearchParams, useRouter } from 'next/navigation'

interface ContractField {
  label: string
  key: string
  type: 'text' | 'date' | 'number' | 'textarea' | 'email'
  placeholder: string
  required: boolean
}

interface ContractTemplate {
  id: string
  name: string
  description: string
  fields: ContractField[]
  content: string
}

export default function CreateContractPage() {
  const { isDark } = useTheme()
  const searchParams = useSearchParams()
  const router = useRouter()
  const templateParam = searchParams.get('template')

  const [selectedTemplate, setSelectedTemplate] = useState<string>(templateParam || '')
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [step, setStep] = useState(1) // 1: Select Template, 2: Fill Details, 3: Preview & Sign
  const [shortLink, setShortLink] = useState('')

  const templates: ContractTemplate[] = [
    {
      id: 'freelance',
      name: 'Freelance Contract',
      description: 'Professional agreement for independent contractors and freelancers',
      fields: [
        { label: 'Client Name', key: 'clientName', type: 'text', placeholder: 'Acme Corporation', required: true },
        { label: 'Freelancer Name', key: 'freelancerName', type: 'text', placeholder: 'John Doe', required: true },
        { label: 'Project Description', key: 'projectDesc', type: 'textarea', placeholder: 'Describe the work to be performed...', required: true },
        { label: 'Payment Amount (€)', key: 'amount', type: 'number', placeholder: '5000', required: true },
        { label: 'Start Date', key: 'startDate', type: 'date', placeholder: '', required: true },
        { label: 'End Date', key: 'endDate', type: 'date', placeholder: '', required: true },
        { label: 'Payment Terms', key: 'paymentTerms', type: 'textarea', placeholder: '50% upfront, 50% upon completion', required: true },
      ],
      content: `FREELANCE SERVICES AGREEMENT

This Freelance Services Agreement ("Agreement") is entered into on {startDate} between:

CLIENT: {clientName}
FREELANCER: {freelancerName}

1. SCOPE OF WORK
The Freelancer agrees to perform the following services:
{projectDesc}

2. COMPENSATION
The Client agrees to pay the Freelancer a total amount of €{amount} for the services rendered.

Payment Terms: {paymentTerms}

3. TERM
This Agreement shall commence on {startDate} and continue until {endDate}, unless terminated earlier as provided herein.

4. INTELLECTUAL PROPERTY
All work product created by the Freelancer shall become the property of the Client upon full payment.

5. CONFIDENTIALITY
Both parties agree to maintain confidentiality of all proprietary information shared during this engagement.

6. TERMINATION
Either party may terminate this Agreement with 14 days written notice.

7. GOVERNING LAW
This Agreement shall be governed by the laws of the jurisdiction in which the Client is located.`
    },
    {
      id: 'nda',
      name: 'Non-Disclosure Agreement',
      description: 'Protect confidential information and trade secrets',
      fields: [
        { label: 'Disclosing Party', key: 'disclosingParty', type: 'text', placeholder: 'Company Name', required: true },
        { label: 'Receiving Party', key: 'receivingParty', type: 'text', placeholder: 'Individual/Company Name', required: true },
        { label: 'Purpose', key: 'purpose', type: 'textarea', placeholder: 'Business discussions, partnership evaluation, etc.', required: true },
        { label: 'Effective Date', key: 'effectiveDate', type: 'date', placeholder: '', required: true },
        { label: 'Duration (months)', key: 'duration', type: 'number', placeholder: '12', required: true },
      ],
      content: `NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is made effective as of {effectiveDate} between:

DISCLOSING PARTY: {disclosingParty}
RECEIVING PARTY: {receivingParty}

PURPOSE: {purpose}

1. DEFINITION OF CONFIDENTIAL INFORMATION
"Confidential Information" means any data or information that is proprietary to the Disclosing Party and not generally known to the public.

2. OBLIGATIONS OF RECEIVING PARTY
The Receiving Party agrees to:
a) Hold and maintain the Confidential Information in strict confidence
b) Not disclose the Confidential Information to any third parties
c) Not use the Confidential Information for any purpose other than the Purpose stated above

3. TERM
This Agreement shall remain in effect for {duration} months from the Effective Date.

4. RETURN OF MATERIALS
Upon termination, the Receiving Party shall return all materials containing Confidential Information.

5. NO LICENSE
Nothing in this Agreement grants any license or right to the Confidential Information except as expressly stated.`
    },
    {
      id: 'service',
      name: 'Service Agreement',
      description: 'General service contract for professional services',
      fields: [
        { label: 'Service Provider', key: 'provider', type: 'text', placeholder: 'Your Company Name', required: true },
        { label: 'Client Name', key: 'client', type: 'text', placeholder: 'Client Company', required: true },
        { label: 'Services Description', key: 'services', type: 'textarea', placeholder: 'Detailed description of services...', required: true },
        { label: 'Monthly Fee (€)', key: 'monthlyFee', type: 'number', placeholder: '2000', required: true },
        { label: 'Contract Start Date', key: 'startDate', type: 'date', placeholder: '', required: true },
        { label: 'Contract Length (months)', key: 'contractLength', type: 'number', placeholder: '12', required: true },
      ],
      content: `SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into as of {startDate} between:

SERVICE PROVIDER: {provider}
CLIENT: {client}

1. SERVICES
The Service Provider agrees to provide the following services:
{services}

2. FEES AND PAYMENT
The Client agrees to pay a monthly fee of €{monthlyFee} for the services provided.
Payment is due on the first day of each month.

3. TERM
This Agreement shall continue for a period of {contractLength} months from the Start Date.

4. RESPONSIBILITIES
Service Provider shall use reasonable care and skill in providing the Services.

5. TERMINATION
Either party may terminate this Agreement with 30 days written notice.

6. LIABILITY
The Service Provider's liability shall be limited to the amount of fees paid in the preceding three months.`
    },
    {
      id: 'employment',
      name: 'Employment Contract',
      description: 'Formal employment agreement for hiring employees',
      fields: [
        { label: 'Company Name', key: 'company', type: 'text', placeholder: 'Your Company Ltd', required: true },
        { label: 'Employee Name', key: 'employee', type: 'text', placeholder: 'Jane Smith', required: true },
        { label: 'Job Title', key: 'jobTitle', type: 'text', placeholder: 'Senior Developer', required: true },
        { label: 'Annual Salary (€)', key: 'salary', type: 'number', placeholder: '60000', required: true },
        { label: 'Start Date', key: 'startDate', type: 'date', placeholder: '', required: true },
        { label: 'Work Location', key: 'location', type: 'text', placeholder: 'Remote / Office Address', required: true },
        { label: 'Working Hours', key: 'hours', type: 'text', placeholder: '40 hours per week', required: true },
      ],
      content: `EMPLOYMENT AGREEMENT

This Employment Agreement ("Agreement") is made on {startDate} between:

EMPLOYER: {company}
EMPLOYEE: {employee}

1. POSITION
The Employee is hired for the position of {jobTitle}.

2. COMPENSATION
The Employee shall receive an annual salary of €{salary}, payable in accordance with the Company's standard payroll schedule.

3. START DATE
Employment shall commence on {startDate}.

4. WORK LOCATION
The Employee will be based at: {location}

5. WORKING HOURS
The Employee shall work {hours}.

6. PROBATION PERIOD
The first 3 months of employment shall constitute a probationary period.

7. CONFIDENTIALITY
The Employee agrees to maintain confidentiality of all company proprietary information.

8. TERMINATION
Employment may be terminated by either party with appropriate notice as per local labor laws.`
    }
  ]

  useEffect(() => {
    if (templateParam) {
      setSelectedTemplate(templateParam)
      setStep(2)
    }
  }, [templateParam])

  useEffect(() => {
    // Generate short link
    if (step === 3) {
      const randomId = Math.random().toString(36).substring(2, 8)
      setShortLink(`qpl.ink/${randomId}`)
    }
  }, [step])

  const getCurrentTemplate = () => {
    return templates.find(t => t.id === selectedTemplate)
  }

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
    setFormData({})
    setStep(2)
  }

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const generateContract = () => {
    const template = getCurrentTemplate()
    if (!template) return ''

    let content = template.content
    Object.entries(formData).forEach(([key, value]) => {
      content = content.replace(new RegExp(`{${key}}`, 'g'), value)
    })
    return content
  }

  const handleNext = () => {
    const template = getCurrentTemplate()
    if (!template) return

    // Check if all required fields are filled
    const allFieldsFilled = template.fields.every(field => {
      if (field.required) {
        return formData[field.key] && formData[field.key].trim() !== ''
      }
      return true
    })

    if (allFieldsFilled) {
      setStep(3)
    } else {
      alert('Please fill in all required fields')
    }
  }

  const handleSaveContract = () => {
    // In a real app, this would save to database
    alert('Contract saved successfully! Signature links have been sent to all parties.')
    router.push('/dashboard/contracts')
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Create Contract</h1>
          <p className={`mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Professional contract creation with digital signatures
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {[
              { num: 1, label: 'Select Template' },
              { num: 2, label: 'Fill Details' },
              { num: 3, label: 'Preview & Share' }
            ].map((item, index) => (
              <div key={item.num} className="flex items-center">
                <div className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step >= item.num
                      ? isDark
                        ? 'bg-[#B8EDFD] text-[#21255B]'
                        : 'bg-blue-600 text-white'
                      : isDark
                        ? 'bg-[#2A2A3C] text-gray-400'
                        : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step > item.num ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      item.num
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${step >= item.num ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-400' : 'text-gray-600')}`}>
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`w-24 h-0.5 mx-4 ${step > item.num ? (isDark ? 'bg-[#B8EDFD]' : 'bg-blue-600') : (isDark ? 'bg-[#2A2A3C]' : 'bg-gray-200')}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Template Selection */}
        {step === 1 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] ${
                  selectedTemplate === template.id
                    ? isDark
                      ? 'border-[#B8EDFD] bg-[#21255B]/20'
                      : 'border-blue-500 bg-blue-50'
                    : isDark
                      ? 'border-[#2A2A3C] bg-[#1A1A24] hover:border-[#B8EDFD]'
                      : 'border-gray-200 bg-white hover:border-blue-400'
                }`}
              >
                <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{template.name}</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{template.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Step 2: Fill Details */}
        {step === 2 && getCurrentTemplate() && (
          <div className={`rounded-xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
            <h2 className={`text-xl font-semibold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {getCurrentTemplate()?.name} Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {getCurrentTemplate()?.fields.map((field) => (
                <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={4}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        isDark
                          ? 'bg-[#0D0D12] border-[#2A2A3C] text-white placeholder-gray-500 focus:border-[#B8EDFD] focus:ring-1 focus:ring-[#B8EDFD]'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      } outline-none`}
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={formData[field.key] || ''}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                        isDark
                          ? 'bg-[#0D0D12] border-[#2A2A3C] text-white placeholder-gray-500 focus:border-[#B8EDFD] focus:ring-1 focus:ring-[#B8EDFD]'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      } outline-none`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setStep(1)}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                Continue to Preview
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Sign */}
        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Contract Preview */}
            <div className="lg:col-span-2">
              <div className={`rounded-xl p-8 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Contract Preview</h2>
                  <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                    Download PDF
                  </button>
                </div>
                <div className={`p-8 rounded-lg font-mono text-sm whitespace-pre-wrap ${isDark ? 'bg-[#0D0D12] text-gray-300' : 'bg-gray-50 text-gray-800'}`}>
                  {generateContract()}
                </div>
              </div>
            </div>

            {/* Signature & Share Panel */}
            <div className="space-y-6">
              {/* Short Link */}
              <div className={`rounded-xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Share Contract</h3>
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Short Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shortLink}
                      readOnly
                      className={`flex-1 px-4 py-2 rounded-lg font-mono text-sm ${isDark ? 'bg-[#0D0D12] border border-[#2A2A3C] text-white' : 'bg-gray-50 border border-gray-200 text-gray-900'}`}
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(shortLink)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              {/* Digital Signature Options */}
              <div className={`rounded-xl p-6 ${isDark ? 'bg-[#1A1A24] border border-[#2A2A3C]' : 'bg-white border border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Digital Signature</h3>
                <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Choose your preferred signing method:
                </p>
                <div className="space-y-3">
                  <button className={`w-full p-4 rounded-lg border-2 transition-all hover:scale-[1.02] ${isDark ? 'border-[#2A2A3C] hover:border-[#B8EDFD] bg-[#0D0D12]' : 'border-gray-200 hover:border-blue-400 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-blue-100'}`}>
                        <svg className={`w-5 h-5 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fingerprint / Face ID</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Use biometric authentication</p>
                      </div>
                    </div>
                  </button>

                  <button className={`w-full p-4 rounded-lg border-2 transition-all hover:scale-[1.02] ${isDark ? 'border-[#2A2A3C] hover:border-[#B8EDFD] bg-[#0D0D12]' : 'border-gray-200 hover:border-blue-400 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-blue-100'}`}>
                        <svg className={`w-5 h-5 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Draw Signature</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sign with mouse or touchscreen</p>
                      </div>
                    </div>
                  </button>

                  <button className={`w-full p-4 rounded-lg border-2 transition-all hover:scale-[1.02] ${isDark ? 'border-[#2A2A3C] hover:border-[#B8EDFD] bg-[#0D0D12]' : 'border-gray-200 hover:border-blue-400 bg-gray-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#21255B]' : 'bg-blue-100'}`}>
                        <svg className={`w-5 h-5 ${isDark ? 'text-[#B8EDFD]' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Verification</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sign via email confirmation</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={handleSaveContract}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${isDark ? 'bg-[#B8EDFD] text-[#21255B] hover:bg-[#a0e5fc]' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                >
                  Save & Send for Signature
                </button>
                <button
                  onClick={() => setStep(2)}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors ${isDark ? 'bg-[#2A2A3C] text-white hover:bg-[#3A3A4C]' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}
                >
                  Edit Contract
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
