/**
 * Order Confirmation Page
 * Displays order confirmation details and next steps
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Order } from "@/types";
import { getOrderById, formatCurrency, formatDateTime, formatStatus, getStatusBadgeVariant } from "@/lib/orders";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  CheckCircle,
  ShoppingBag,
  Package,
  CreditCard,
  Truck,
  Mail,
  Phone,
  AlertCircle,
  MapPin,
} from "lucide-react";

export default function OrderConfirmationPage() {
  const router = useRouter();
  const params = useParams();
  const { session } = useAuth();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setError("No order ID provided");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const token = session?.user?.email ? "dummy-token" : undefined;
        const data = await getOrderById(orderId, token);
        setOrder(data);
      } catch (err: any) {
        console.error("Failed to load order:", err);
        setError(err.message || "Failed to load order details");
      } finally {
        setLoading(false);
      }
    }

    loadOrder();
  }, [orderId, session]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <div className="container mx-auto flex flex-1 items-center justify-center px-4">
          <Card className="w-full max-w-md border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Error Loading Order
              </CardTitle>
              <CardDescription>{error || "Order not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/products")} className="w-full">
                Back to Products
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Success Banner */}
      <section className="border-b border-border bg-gradient-to-b from-secondary/10 to-background px-4 py-12">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-secondary/20 p-4">
              <CheckCircle className="h-12 w-12 text-secondary" />
            </div>
          </div>
          <h1 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Order Placed Successfully!
          </h1>
          <p className="mb-2 text-lg text-muted-foreground">
            Thank you for your order. We'll process it shortly.
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground">Order Number:</span>
            <Badge variant="secondary" className="text-base font-mono">
              {order.orderNumber}
            </Badge>
          </div>
        </div>
      </section>

      <main className="container mx-auto max-w-4xl px-4 py-12">
        <div className="space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Order Items
              </CardTitle>
              <CardDescription>Products in your order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.orderItems && order.orderItems.length > 0 ? (
                <div className="space-y-4">
                  {order.orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{item.productTitle}</h4>
                        {item.productSku && (
                          <p className="text-sm text-muted-foreground">SKU: {item.productSku}</p>
                        )}
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatCurrency(item.unitPrice)} × {item.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No items in this order</p>
              )}
            </CardContent>
          </Card>

          {/* Price Summary */}
          <Card className="border-secondary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Price Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                  <span>Discount:</span>
                  <span>-{formatCurrency(order.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery Fee:</span>
                <span>{formatCurrency(order.deliveryFee)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(order.totalAmount)}</span>
                </div>
              </div>
              {order.paymentMethod && (
                <div className="mt-4 rounded-lg bg-muted p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium capitalize">{order.paymentMethod}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Information
              </CardTitle>
              <CardDescription>Where we'll deliver your order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="mt-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  {order.deliveryAddress && <p className="font-medium">{order.deliveryAddress}</p>}
                  <p className="text-sm text-muted-foreground">
                    {order.deliveryTown}, {order.deliveryCounty}
                  </p>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-muted p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Order Status</p>
                    <Badge variant={getStatusBadgeVariant(order.status)} className="mt-1">
                      {formatStatus(order.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              {order.trackingNumber && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm text-muted-foreground">Tracking Number</p>
                  <p className="font-mono font-medium">{order.trackingNumber}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Instructions */}
          {!order.paymentConfirmed && (
            <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Payment Pending
                </CardTitle>
                <CardDescription>Complete your payment to process your order</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <h4 className="mb-2 font-semibold">M-Pesa Payment</h4>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-semibold">1.</span>
                      <span>Go to M-Pesa on your phone</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">2.</span>
                      <span>Select Lipa Na M-Pesa, then Pay Bill</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">3.</span>
                      <span>
                        Enter Business Number: <strong>123456</strong>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">4.</span>
                      <span>
                        Enter Account Number: <strong>{order.orderNumber}</strong>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">5.</span>
                      <span>
                        Enter Amount: <strong>{formatCurrency(order.totalAmount)}</strong>
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-semibold">6.</span>
                      <span>Enter your M-Pesa PIN and confirm</span>
                    </li>
                  </ol>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <h4 className="mb-2 font-semibold">Bank Transfer</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank:</span>
                      <span className="font-medium">Equity Bank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name:</span>
                      <span className="font-medium">Glam by Lynn</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-medium">1234567890</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reference:</span>
                      <span className="font-medium">{order.orderNumber}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/20">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <p className="text-blue-900 dark:text-blue-100">
                    After making payment, send confirmation via WhatsApp to{" "}
                    <strong>+254 700 000 000</strong> or email to{" "}
                    <strong>payments@glambylynn.com</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>What Happens Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {!order.paymentConfirmed && (
                  <li className="flex gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                      1
                    </span>
                    <div>
                      <p className="font-medium">Complete Your Payment</p>
                      <p className="text-sm text-muted-foreground">
                        Pay the total amount to confirm your order
                      </p>
                    </div>
                  </li>
                )}
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {!order.paymentConfirmed ? "2" : "1"}
                  </span>
                  <div>
                    <p className="font-medium">We'll Process Your Order</p>
                    <p className="text-sm text-muted-foreground">
                      Your order will be prepared and packaged with care
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {!order.paymentConfirmed ? "3" : "2"}
                  </span>
                  <div>
                    <p className="font-medium">Delivery Arrangement</p>
                    <p className="text-sm text-muted-foreground">
                      We'll contact you to arrange delivery or pickup
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {!order.paymentConfirmed ? "4" : "3"}
                  </span>
                  <div>
                    <p className="font-medium">Receive Your Products</p>
                    <p className="text-sm text-muted-foreground">
                      Your beauty products will be delivered to your address
                    </p>
                  </div>
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>Get in touch with us</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone / WhatsApp</p>
                  <a href="tel:+254700000000" className="font-medium hover:text-secondary">
                    +254 700 000 000
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href="mailto:info@glambylynn.com"
                    className="font-medium hover:text-secondary"
                  >
                    info@glambylynn.com
                  </a>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
                <p className="text-muted-foreground">
                  Order placed on {formatDateTime(order.createdAt || new Date().toISOString())}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => router.push("/products")} variant="outline" className="flex-1">
              Continue Shopping
            </Button>
            <Button onClick={() => router.push("/")} className="flex-1">
              Back to Home
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
