import os
from b2sdk.v2 import InMemoryAccountInfo, B2Api
from dotenv import load_dotenv

load_dotenv()

class B2Storage:
    def __init__(self):
        self.key_id = os.getenv("B2_KEY_ID")
        self.application_key = os.getenv("B2_APPLICATION_KEY")
        self.bucket_name = os.getenv("B2_BUCKET_NAME")
        
        self.info = InMemoryAccountInfo()
        self.b2_api = B2Api(self.info)
        
        if self.key_id and self.application_key:
            self.b2_api.authorize_account("production", self.key_id, self.application_key)
            self.bucket = self.b2_api.get_bucket_by_name(self.bucket_name)
        else:
            print("Warning: B2 credentials not configured")
            self.bucket = None

    def upload_file(self, local_path, remote_path):
        if not self.bucket:
            return None
        
        self.bucket.upload_local_file(
            local_file=local_path,
            file_name=remote_path,
        )
        return self.get_public_url(remote_path)

    def get_public_url(self, remote_path):
        # This assumes the bucket is public or has a friendly URL setup
        # Backblaze friendly URL format: https://f000.backblazeb2.com/file/bucket-name/file-name
        # Or using the S3 endpoint if configured
        return f"https://{self.bucket_name}.s3.us-east-005.backblazeb2.com/{remote_path}"

b2_storage = B2Storage()
