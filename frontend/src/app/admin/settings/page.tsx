/**
 * Admin Settings Page
 * Configure site-wide settings, business info, and admin users
 */

"use client";

import { useState, useEffect } from "react";
import { useRequireAdmin } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Save,
  Building,
  Clock,
  Bell,
  CreditCard,
  Globe,
  Mail,
  Phone,
  MapPin,
  ToggleLeft,
  Loader2,
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
      // const response = await axios.put('/api/admin/settings/business', businessInfo);

      // Simulate API call
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
        <div>
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
            <CardContent className="space-y-4">
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
                    <input
                      type="checkbox"
                      checked={featureToggles.enable_newsletter}
                      onChange={(e) =>
                        setFeatureToggles({
                          ...featureToggles,
                          enable_newsletter: e.target.checked,
                        })
                      }
                      className="h-4 w-4"
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button onClick={handleSaveFeatureToggles} disabled={saving}>
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Business Info Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Update your business details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Name</label>
                <input
                  type="text"
                  value={businessInfo.businessName}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, businessName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={businessInfo.description}
                  onChange={(e) => setBusinessInfo({ ...businessInfo, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={businessInfo.email}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, email: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">WhatsApp</label>
                  <input
                    type="tel"
                    value={businessInfo.whatsapp}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, whatsapp: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                    placeholder="+254 XXX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Address
                  </label>
                  <input
                    type="text"
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({ ...businessInfo, address: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveBusinessInfo} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Social Media Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Social Media Links</CardTitle>
              <CardDescription>
                Add your social media profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Facebook</label>
                <input
                  type="url"
                  value={socialMedia.facebook}
                  onChange={(e) => setSocialMedia({ ...socialMedia, facebook: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="https://facebook.com/glambylynn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Instagram</label>
                <input
                  type="url"
                  value={socialMedia.instagram}
                  onChange={(e) => setSocialMedia({ ...socialMedia, instagram: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="https://instagram.com/glambylynn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Twitter</label>
                <input
                  type="url"
                  value={socialMedia.twitter}
                  onChange={(e) => setSocialMedia({ ...socialMedia, twitter: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="https://twitter.com/glambylynn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">TikTok</label>
                <input
                  type="url"
                  value={socialMedia.tiktok}
                  onChange={(e) => setSocialMedia({ ...socialMedia, tiktok: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="https://tiktok.com/@glambylynn"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">YouTube</label>
                <input
                  type="url"
                  value={socialMedia.youtube}
                  onChange={(e) => setSocialMedia({ ...socialMedia, youtube: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="https://youtube.com/@glambylynn"
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSocialMedia} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Hours Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>
                Set your operating hours for each day of the week
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(businessHours).map(([day, hours]) => (
                <div key={day} className="flex items-center gap-4 border-b pb-4 last:border-0">
                  <div className="w-24">
                    <span className="font-medium capitalize">{day}</span>
                  </div>
                  <div className="flex items-center gap-4 flex-1">
                    <input
                      type="time"
                      value={hours.open}
                      onChange={(e) => setBusinessHours({
                        ...businessHours,
                        [day]: { ...hours, open: e.target.value }
                      })}
                      disabled={hours.closed}
                      className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={hours.close}
                      onChange={(e) => setBusinessHours({
                        ...businessHours,
                        [day]: { ...hours, close: e.target.value }
                      })}
                      disabled={hours.closed}
                      className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary disabled:opacity-50"
                    />
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hours.closed}
                        onChange={(e) => setBusinessHours({
                          ...businessHours,
                          [day]: { ...hours, closed: e.target.checked }
                        })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">Closed</span>
                    </label>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveBusinessHours} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Settings Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure payment methods and deposit requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">M-Pesa Payments</div>
                    <div className="text-sm text-muted-foreground">Accept M-Pesa payments</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentSettings.mpesaEnabled}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, mpesaEnabled: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                {paymentSettings.mpesaEnabled && (
                  <div>
                    <label className="block text-sm font-medium mb-2">M-Pesa Shortcode</label>
                    <input
                      type="text"
                      value={paymentSettings.mpesaShortcode}
                      onChange={(e) => setPaymentSettings({ ...paymentSettings, mpesaShortcode: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                      placeholder="Enter M-Pesa shortcode"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Cash Payments</div>
                    <div className="text-sm text-muted-foreground">Accept cash on delivery/service</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={paymentSettings.acceptCash}
                    onChange={(e) => setPaymentSettings({ ...paymentSettings, acceptCash: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Deposit Percentage</label>
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
                  <p className="text-sm text-muted-foreground mt-2">
                    Required deposit for bookings
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSavePaymentSettings} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notifications Section */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>
                Configure which email notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Notification Email</label>
                <input
                  type="email"
                  value={notificationSettings.notificationEmail}
                  onChange={(e) => setNotificationSettings({ ...notificationSettings, notificationEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-secondary"
                  placeholder="admin@glambylynn.com"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  All admin notifications will be sent to this email
                </p>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">New Order Notifications</div>
                    <div className="text-sm text-muted-foreground">Get notified when a new order is placed</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNewOrder}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNewOrder: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">New Booking Notifications</div>
                    <div className="text-sm text-muted-foreground">Get notified when a new booking is made</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailNewBooking}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNewBooking: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Low Stock Alerts</div>
                    <div className="text-sm text-muted-foreground">Get notified when products are low in stock</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailLowStock}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, emailLowStock: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Cancellation Notifications</div>
                    <div className="text-sm text-muted-foreground">Get notified when orders or bookings are cancelled</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailCancellation}
                    onChange={(e) => setNotificationSettings({ ...notificationSettings, emailCancellation: e.target.checked })}
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveNotifications} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
