"""Pydantic schemas for storage settings management."""
from typing import Literal, Optional

from pydantic import BaseModel


class S3Config(BaseModel):
    bucket_name: str
    access_key_id: str
    secret_access_key: str
    region: str = "us-east-1"


class CloudinaryConfig(BaseModel):
    cloud_name: str
    api_key: str
    api_secret: str


class StorageSettingsUpdate(BaseModel):
    provider: Literal["local", "s3", "cloudinary"]
    s3: Optional[S3Config] = None
    cloudinary: Optional[CloudinaryConfig] = None


class S3ConfigResponse(BaseModel):
    bucket_name: str
    access_key_id: str
    secret_access_key: str  # masked as "********"
    region: str


class CloudinaryConfigResponse(BaseModel):
    cloud_name: str
    api_key: str
    api_secret: str  # masked as "********"


class StorageSettingsResponse(BaseModel):
    provider: str
    s3: Optional[S3ConfigResponse] = None
    cloudinary: Optional[CloudinaryConfigResponse] = None


class TestConnectionRequest(BaseModel):
    provider: Literal["local", "s3", "cloudinary"]
    s3: Optional[S3Config] = None
    cloudinary: Optional[CloudinaryConfig] = None


class TestConnectionResponse(BaseModel):
    success: bool
    message: str
