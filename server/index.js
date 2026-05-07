require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const app = express();
const port = process.env.B2_PROXY_PORT || 3001;

app.use(cors());
app.use(express.json());

const s3 = new S3Client({
    endpoint: `https://${process.env.B2_ENDPOINT}`,
    region: process.env.B2_REGION,
    credentials: {
        accessKeyId: process.env.B2_KEY_ID,
        secretAccessKey: process.env.B2_APPLICATION_KEY,
    }
});

// Get a presigned URL for downloading/viewing
app.get('/api/storage/url/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const command = new GetObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: filename,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        res.json({ url });
    } catch (error) {
        console.error('Error generating URL:', error);
        res.status(500).json({ error: 'Failed to generate URL' });
    }
});

// Get a presigned URL for uploading
app.get('/api/storage/upload-url/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        const contentType = req.query.contentType || 'application/octet-stream';
        
        const command = new PutObjectCommand({
            Bucket: process.env.B2_BUCKET_NAME,
            Key: filename,
            ContentType: contentType
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
        res.json({ url });
    } catch (error) {
        console.error('Error generating upload URL:', error);
        res.status(500).json({ error: 'Failed to generate upload URL' });
    }
});

app.listen(port, () => {
    console.log(`B2 Proxy Server running at http://localhost:${port}`);
});
