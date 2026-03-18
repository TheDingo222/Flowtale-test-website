import { BlobServiceClient } from '@azure/storage-blob'

function getBlobClient(): BlobServiceClient {
  const account = process.env.AZURE_BLOB_ACCOUNT_NAME
  const key = process.env.AZURE_BLOB_ACCOUNT_KEY

  if (!account || !key) {
    throw new Error('Azure Blob Storage credentials not configured')
  }

  const connectionString = `DefaultEndpointsProtocol=https;AccountName=${account};AccountKey=${key};EndpointSuffix=core.windows.net`
  return BlobServiceClient.fromConnectionString(connectionString)
}

export async function uploadReceipt(
  file: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  const client = getBlobClient()
  const containerName = process.env.AZURE_BLOB_CONTAINER_NAME || 'receipts'
  const container = client.getContainerClient(containerName)
  await container.createIfNotExists({ access: 'blob' })

  // Sanitize filename and add timestamp to avoid collisions
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const blobName = `${Date.now()}-${sanitized}`
  const blockBlob = container.getBlockBlobClient(blobName)

  await blockBlob.upload(file, file.length, {
    blobHTTPHeaders: { blobContentType: contentType },
  })

  return blockBlob.url
}
