"""Amazon S3 storage provider."""
import io
import logging

from app.services.storage.base import StorageProvider

logger = logging.getLogger(__name__)


class S3StorageProvider(StorageProvider):
    """Uploads files to an S3 bucket."""

    def __init__(self, bucket_name: str, access_key_id: str, secret_access_key: str, region: str):
        import boto3
        self.bucket_name = bucket_name
        self.region = region
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=access_key_id,
            aws_secret_access_key=secret_access_key,
            region_name=region,
        )

    def upload(self, file_data: bytes, file_key: str, content_type: str) -> str:
        self.s3_client.upload_fileobj(
            io.BytesIO(file_data),
            self.bucket_name,
            file_key,
            ExtraArgs={"ContentType": content_type, "ACL": "public-read"},
        )
        return f"https://{self.bucket_name}.s3.{self.region}.amazonaws.com/{file_key}"

    def delete(self, file_url: str) -> bool:
        try:
            if file_url.startswith("https://"):
                parts = file_url.split(
                    f"{self.bucket_name}.s3.{self.region}.amazonaws.com/"
                )
                if len(parts) == 2:
                    file_key = parts[1]
                else:
                    return False
            else:
                file_key = file_url

            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
            return True
        except Exception as e:
            logger.warning(f"S3 delete failed: {e}")
            return False

    def test_connection(self) -> dict:
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            return {"success": True, "message": f"Connected to S3 bucket '{self.bucket_name}'"}
        except Exception as e:
            return {"success": False, "message": f"S3 connection failed: {e}"}
