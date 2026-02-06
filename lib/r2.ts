import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { nanoid } from 'nanoid'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function uploadImage(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const filename = `${nanoid()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filename,
    Body: Buffer.from(buffer),
    ContentType: file.type,
  })

  await r2.send(command)

  return `${process.env.R2_PUBLIC_URL}/${filename}`
}

export async function deleteImage(url: string): Promise<void> {
  try {
    const filename = url.split('/').pop()
    if (!filename) return

    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
    })

    await r2.send(command)
  } catch (error) {
    console.error('Error deleting image:', error)
  }
}
