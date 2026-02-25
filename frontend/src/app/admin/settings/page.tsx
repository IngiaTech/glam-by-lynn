/**
 * Admin Settings Page
 * Configure site-wide settings, business info, and admin users
 */

"use client";

import { useState, useEffect } from "react";
import { useRequireAdmin } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Save,
  Mail,
  Phone,
  MapPin,
  ToggleLeft,
  Loader2,
  HardDrive,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { extractErrorMessage } from "@/lib/error-utils";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { useAuth } from "@/hooks/useAuth";

export default function AdminSettingsPage() {
  const { user, loading: authLoading, isAdmin } = useRequireAdmin();
  const { session } = useAuth();

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Feature Toggles (persisted via API)
  const [featureToggles, setFeatureToggles] = useState({
    enable_newsletter: false,
  });

  // Business Info
  const [businessInfo, setBusinessInfo] = useState({
    businessName: "Glam by Lynn",
    description: "Premier makeup artistry and beauty services in Kitui and Nairobi, Kenya",
    email: "contact@glambylynn.com",
    phone: "+254 XXX XXX XXX",
    whatsapp: "+254 XXX XXX XXX",
    address: "Kitui & Nairobi, Kenya",
  });

  // Social Media
  const [socialMedia, setSocialMedia] = useState({
    facebook: "",
    instagram: "",
    twitter: "",
    tiktok: "",
    youtube: "",
  });

  // Business Hours
  const [businessHours, setBusinessHours] = useState({
    monday: { open: "09:00", close: "18:00", closed: false },
    tuesday: { open: "09:00", close: "18:00", closed: false },
    wednesday: { open: "09:00", close: "18:00", closed: false },
    thursday: { open: "09:00", close: "18:00", closed: false },
    friday: { open: "09:00", close: "18:00", closed: false },
    saturday: { open: "09:00", close: "18:00", closed: false },
    sunday: { open: "09:00", close: "18:00", closed: true },
  });

  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState({
    mpesaEnabled: true,
    mpesaShortcode: "",
    depositPercentage: 50,
    acceptCash: true,
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNewOrder: true,
    emailNewBooking: true,
    emailLowStock: true,
    emailCancellation: true,
    notificationEmail: "admin@glambylynn.com",
  });

  // Image Storage Settings
  const [storageProvider, setStorageProvider] = useState<"local" | "s3" | "cloudinary">("local");
  const [s3Config, setS3Config] = useState({
    bucket_name: "",
    access_key_id: "",
    secret_access_key: "",
    region: "us-east-1",
  });
  const [cloudinaryConfig, setCloudinaryConfig] = useState({
    cloud_name: "",
    api_key: "",
    api_secret: "",
  });
  const [storageSaving, setStorageSaving] = useState(false);
  const [storageTesting, setStorageTesting] = useState(false);
  const [storageTestResult, setStorageTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [storageSuccess, setStorageSuccess] = useState("");
  const [storageError, setStorageError] = useState("");

  // Fetch saved settings from API on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const token = (session as any)?.accessToken;
        if (!token) return;
        const response = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.SETTINGS.ADMIN_LIST}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (response.ok) {
          const data = await response.json();
          setFeatureToggles((prev) => ({
            ...prev,
            enable_newsletter: data.enable_newsletter ?? false,
          }));
          setSocialMedia((prev) => ({
            ...prev,
            facebook: data.social_facebook ?? "",
            instagram: data.social_instagram ?? "",
            twitter: data.social_twitter ?? "",
            tiktok: data.social_tiktok ?? "",
            youtube: data.social_youtube ?? "",
          }));
        }

        // Load storage settings
        const storageRes = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.SETTINGS.STORAGE_GET}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (storageRes.ok) {
          const storageData = await storageRes.json();
          setStorageProvider(storageData.provider || "local");
          if (storageData.s3) {
            setS3Config({
              bucket_name: storageData.s3.bucket_name || "",
              access_key_id: storageData.s3.access_key_id || "",
              secret_access_key: storageData.s3.secret_access_key || "",
              region: storageData.s3.region || "us-east-1",
            });
          }
          if (storageData.cloudinary) {
            setCloudinaryConfig({
              cloud_name: storageData.cloudinary.cloud_name || "",
              api_key: storageData.cloudinary.api_key || "",
              api_secret: storageData.cloudinary.api_secret || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setSettingsLoading(false);
      }
    }
    if (!authLoading && isAdmin) {
      loadSettings();
    }
  }, [authLoading, isAdmin, session]);

  const handleSaveFeatureToggles = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const token = (session as any)?.accessToken;
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SETTINGS.ADMIN_UPDATE}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(featureToggles),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      setSaveSuccess("Feature toggles saved successfully");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error saving feature toggles:", err);
      setSaveError(extractErrorMessage(err, "Failed to save feature toggles"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessInfo = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      // TODO: Implement API call to save business info
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveSuccess("Business information saved successfully");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error saving business info:", err);
      setSaveError(extractErrorMessage(err, "Failed to save business information"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocialMedia = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const token = (session as any)?.accessToken;
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SETTINGS.ADMIN_UPDATE}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            social_facebook: socialMedia.facebook,
            social_instagram: socialMedia.instagram,
            social_twitter: socialMedia.twitter,
            social_tiktok: socialMedia.tiktok,
            social_youtube: socialMedia.youtube,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save social media links");
      }

      setSaveSuccess("Social media links saved successfully");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error saving social media:", err);
      setSaveError(extractErrorMessage(err, "Failed to save social media links"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBusinessHours = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveSuccess("Business hours saved successfully");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error saving business hours:", err);
      setSaveError(extractErrorMessage(err, "Failed to save business hours"));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePaymentSettings = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveSuccess("Payment settings saved successfully");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error saving payment settings:", err);
      setSaveError(extractErrorMessage(err, "Failed to save payment settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setSaveSuccess("Notification settings saved successfully");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err: any) {
      console.error("Error saving notification settings:", err);
      setSaveError(extractErrorMessage(err, "Failed to save notification settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleTestStorageConnection = async () => {
    setStorageTesting(true);
    setStorageTestResult(null);
    setStorageError("");

    try {
      const token = (session as any)?.accessToken;
      const body: any = { provider: storageProvider };
      if (storageProvider === "s3") body.s3 = s3Config;
      if (storageProvider === "cloudinary") body.cloudinary = cloudinaryConfig;

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SETTINGS.STORAGE_TEST}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) throw new Error("Test request failed");
      const result = await response.json();
      setStorageTestResult(result);
    } catch (err: any) {
      setStorageTestResult({ success: false, message: extractErrorMessage(err, "Connection test failed") });
    } finally {
      setStorageTesting(false);
    }
  };

  const handleSaveStorageSettings = async () => {
    setStorageSaving(true);
    setStorageError("");
    setStorageSuccess("");
    setStorageTestResult(null);

    try {
      const token = (session as any)?.accessToken;
      const body: any = { provider: storageProvider };
      if (storageProvider === "s3") body.s3 = s3Config;
      if (storageProvider === "cloudinary") body.cloudinary = cloudinaryConfig;

      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SETTINGS.STORAGE_UPDATE}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) throw new Error("Failed to save storage settings");

      setStorageSuccess("Storage settings saved successfully");
      setTimeout(() => setStorageSuccess(""), 3000);
    } catch (err: any) {
      setStorageError(extractErrorMessage(err, "Failed to save storage settings"));
    } finally {
      setStorageSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your site configuration and business settings
        </p>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-4 rounded">
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {saveError}
        </div>
      )}

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Feature Toggles Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              Feature Toggles
            </CardTitle>
            <CardDescription>
              Enable or disable site features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Newsletter Subscription</div>
                    <div className="text-sm text-muted-foreground">
                      Show newsletter signup on the homepage and footer
                    </div>
                  </div>
                  <Switch
                    checked={featureToggles.enable_newsletter}
                    onCheckedChange={(checked) =>
                      setFeatureToggles({
                        ...featureToggles,
                        enable_newsletter: checked,
                      })
                    }
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveFeatureToggles} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Image Storage Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Image Storage
            </CardTitle>
            <CardDescription>
              Configure where uploaded images are stored
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {settingsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Success / Error */}
                {storageSuccess && (
                  <div className="bg-green-50 border-l-4 border-green-500 text-green-700 p-3 rounded text-sm">
                    {storageSuccess}
                  </div>
                )}
                {storageError && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm">
                    {storageError}
                  </div>
                )}

                {/* Provider Select */}
                <div className="space-y-2">
                  <Label>Storage Provider</Label>
                  <Select
                    value={storageProvider}
                    onValueChange={(value: "local" | "s3" | "cloudinary") => {
                      setStorageProvider(value);
                      setStorageTestResult(null);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Storage (default)</SelectItem>
                      <SelectItem value="s3">Amazon S3</SelectItem>
                      <SelectItem value="cloudinary">Cloudinary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Warning Banner */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Switching providers does not migrate existing images. Old image URLs will continue to work as long as the files remain at their original location.</span>
                </div>

                {/* S3 Config */}
                {storageProvider === "s3" && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium text-sm">Amazon S3 Configuration</h4>
                    <div className="space-y-2">
                      <Label htmlFor="s3-bucket">Bucket Name</Label>
                      <Input
                        id="s3-bucket"
                        value={s3Config.bucket_name}
                        onChange={(e) => setS3Config({ ...s3Config, bucket_name: e.target.value })}
                        placeholder="my-bucket"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s3-access-key">Access Key ID</Label>
                      <Input
                        id="s3-access-key"
                        value={s3Config.access_key_id}
                        onChange={(e) => setS3Config({ ...s3Config, access_key_id: e.target.value })}
                        placeholder="AKIA..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s3-secret">Secret Access Key</Label>
                      <Input
                        id="s3-secret"
                        type="password"
                        value={s3Config.secret_access_key}
                        onChange={(e) => setS3Config({ ...s3Config, secret_access_key: e.target.value })}
                        placeholder="Enter secret access key"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s3-region">Region</Label>
                      <Input
                        id="s3-region"
                        value={s3Config.region}
                        onChange={(e) => setS3Config({ ...s3Config, region: e.target.value })}
                        placeholder="us-east-1"
                      />
                    </div>
                  </div>
                )}

                {/* Cloudinary Config */}
                {storageProvider === "cloudinary" && (
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium text-sm">Cloudinary Configuration</h4>
                    <div className="space-y-2">
                      <Label htmlFor="cloudinary-cloud">Cloud Name</Label>
                      <Input
                        id="cloudinary-cloud"
                        value={cloudinaryConfig.cloud_name}
                        onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, cloud_name: e.target.value })}
                        placeholder="my-cloud"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cloudinary-key">API Key</Label>
                      <Input
                        id="cloudinary-key"
                        value={cloudinaryConfig.api_key}
                        onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, api_key: e.target.value })}
                        placeholder="123456789"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cloudinary-secret">API Secret</Label>
                      <Input
                        id="cloudinary-secret"
                        type="password"
                        value={cloudinaryConfig.api_secret}
                        onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, api_secret: e.target.value })}
                        placeholder="Enter API secret"
                      />
                    </div>
                  </div>
                )}

                {/* Test Connection Result */}
                {storageTestResult && (
                  <div
                    className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                      storageTestResult.success
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-red-50 border border-red-200 text-red-800"
                    }`}
                  >
                    {storageTestResult.success ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <span>{storageTestResult.message}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={handleTestStorageConnection}
                    disabled={storageTesting || storageSaving}
                  >
                    {storageTesting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {storageTesting ? "Testing..." : "Test Connection"}
                  </Button>
                  <Button onClick={handleSaveStorageSettings} disabled={storageSaving || storageTesting}>
                    <Save className="mr-2 h-4 w-4" />
                    {storageSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Business Info Section */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Update your business details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business Name</Label>
              <Input
                id="business-name"
                value={businessInfo.businessName}
                onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-description">Description</Label>
              <Textarea
                id="business-description"
                value={businessInfo.description}
                onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business-email">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="business-email"
                  type="email"
                  value={businessInfo.email}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-phone">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <Input
                  id="business-phone"
                  type="tel"
                  value={businessInfo.phone}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="business-whatsapp">WhatsApp</Label>
                <Input
                  id="business-whatsapp"
                  type="tel"
                  value={businessInfo.whatsapp}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, whatsapp: e.target.value })}
                  placeholder="+254 XXX XXX XXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business-address">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Input
                  id="business-address"
                  value={businessInfo.address}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveBusinessInfo} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Social Media Section */}
        <Card>
          <CardHeader>
            <CardTitle>Social Media Links</CardTitle>
            <CardDescription>
              Add your social media profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="social-facebook">Facebook</Label>
              <Input
                id="social-facebook"
                type="url"
                value={socialMedia.facebook}
                onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
                placeholder="https://facebook.com/glambylynn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="social-instagram">Instagram</Label>
              <Input
                id="social-instagram"
                type="url"
                value={socialMedia.instagram}
                onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                placeholder="https://instagram.com/glambylynn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="social-twitter">Twitter</Label>
              <Input
                id="social-twitter"
                type="url"
                value={socialMedia.twitter}
                onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
                placeholder="https://twitter.com/glambylynn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="social-tiktok">TikTok</Label>
              <Input
                id="social-tiktok"
                type="url"
                value={socialMedia.tiktok}
                onChange={(e) => setSocialMedia({ ...socialMedia, tiktok: e.target.value })}
                placeholder="https://tiktok.com/@glambylynn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="social-youtube">YouTube</Label>
              <Input
                id="social-youtube"
                type="url"
                value={socialMedia.youtube}
                onChange={(e) => setSocialMedia({ ...socialMedia, youtube: e.target.value })}
                placeholder="https://youtube.com/@glambylynn"
              />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveSocialMedia} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Business Hours Section */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <CardDescription>
              Set your operating hours for each day of the week
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(businessHours).map(([day, hours]) => (
              <div key={day} className="flex items-center gap-4 border-b pb-4 last:border-0 last:pb-0">
                <div className="w-24">
                  <span className="font-medium capitalize">{day}</span>
                </div>
                <div className="flex items-center gap-4 flex-1">
                  <Input
                    type="time"
                    value={hours.open}
                    onChange={(e) => setBusinessHours({
                      ...businessHours,
                      [day]: { ...hours, open: e.target.value }
                    })}
                    disabled={hours.closed}
                    className="w-auto"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={hours.close}
                    onChange={(e) => setBusinessHours({
                      ...businessHours,
                      [day]: { ...hours, close: e.target.value }
                    })}
                    disabled={hours.closed}
                    className="w-auto"
                  />
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={hours.closed}
                      onCheckedChange={(checked) => setBusinessHours({
                        ...businessHours,
                        [day]: { ...hours, closed: checked }
                      })}
                    />
                    <Label className="text-sm font-normal">Closed</Label>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end">
              <Button onClick={handleSaveBusinessHours} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Settings Section */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>
              Configure payment methods and deposit requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">M-Pesa Payments</div>
                <div className="text-sm text-muted-foreground">Accept M-Pesa payments</div>
              </div>
              <Switch
                checked={paymentSettings.mpesaEnabled}
                onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, mpesaEnabled: checked })}
              />
            </div>

            {paymentSettings.mpesaEnabled && (
              <div className="space-y-2">
                <Label htmlFor="mpesa-shortcode">M-Pesa Shortcode</Label>
                <Input
                  id="mpesa-shortcode"
                  value={paymentSettings.mpesaShortcode}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, mpesaShortcode: e.target.value })}
                  placeholder="Enter M-Pesa shortcode"
                />
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Cash Payments</div>
                <div className="text-sm text-muted-foreground">Accept cash on delivery/service</div>
              </div>
              <Switch
                checked={paymentSettings.acceptCash}
                onCheckedChange={(checked) => setPaymentSettings({ ...paymentSettings, acceptCash: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label>Deposit Percentage</Label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={paymentSettings.depositPercentage}
                  onChange={(e) => setPaymentSettings({ ...paymentSettings, depositPercentage: parseInt(e.target.value) })}
                  className="flex-1"
                />
                <span className="font-medium w-12 text-right">{paymentSettings.depositPercentage}%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Required deposit for bookings
              </p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSavePaymentSettings} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Configure which email notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input
                id="notification-email"
                type="email"
                value={notificationSettings.notificationEmail}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, notificationEmail: e.target.value })}
                placeholder="admin@glambylynn.com"
              />
              <p className="text-sm text-muted-foreground">
                All admin notifications will be sent to this email
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">New Order Notifications</div>
                  <div className="text-sm text-muted-foreground">Get notified when a new order is placed</div>
                </div>
                <Switch
                  checked={notificationSettings.emailNewOrder}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNewOrder: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">New Booking Notifications</div>
                  <div className="text-sm text-muted-foreground">Get notified when a new booking is made</div>
                </div>
                <Switch
                  checked={notificationSettings.emailNewBooking}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailNewBooking: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Low Stock Alerts</div>
                  <div className="text-sm text-muted-foreground">Get notified when products are low in stock</div>
                </div>
                <Switch
                  checked={notificationSettings.emailLowStock}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailLowStock: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Cancellation Notifications</div>
                  <div className="text-sm text-muted-foreground">Get notified when orders or bookings are cancelled</div>
                </div>
                <Switch
                  checked={notificationSettings.emailCancellation}
                  onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, emailCancellation: checked })}
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSaveNotifications} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
