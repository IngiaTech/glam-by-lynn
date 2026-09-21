/**
 * Admin Dashboard Homepage
 * Overview of key metrics and quick actions
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Package,
  ShoppingBag,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  DollarSign,
} from "lucide-react";
import { extractErrorMessage } from "@/lib/error-utils";
import Link from "next/link";
import { useRequireAdmin } from "@/hooks/useAuth";
import axios from "axios";

interface OverviewStats {
  totalRevenue: string;
  totalOrders: number;
  totalBookings: number;
  totalProducts: number;
  totalCustomers: number;
  pendingOrders: number;
  pendingBookings: number;
  revenueChangePercent?: number;
  ordersChangePercent?: number;
}

interface RecentActivityItem {
  type: "order" | "booking";
  id: string;
  reference: string;
  summary: string;
  status: string;
  amount: string;
  createdAt: string;
}

/** "just now", "5 minutes ago", "3 days ago" — falls back to a date after a week. */
function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";

  const units: Array<[number, string]> = [
    [60 * 60 * 24, "day"],
    [60 * 60, "hour"],
    [60, "minute"],
  ];
  if (seconds >= 60 * 60 * 24 * 7) {
    return new Date(iso).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }
  for (const [size, name] of units) {
    const count = Math.floor(seconds / size);
    if (count >= 1) return `${count} ${name}${count === 1 ? "" : "s"} ago`;
  }
  return "just now";
}

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useRequireAdmin();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.accessToken;

      if (!token) {
        setError("Authentication required");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const base = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/analytics`;

      const [overview, activity] = await Promise.all([
        axios.get<OverviewStats>(`${base}/overview`, { headers }),
        axios.get<RecentActivityItem[]>(`${base}/recent-activity`, { headers }),
      ]);

      setStats(overview.data);
      setRecentActivity(activity.data);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(extractErrorMessage(err, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    return `KSh ${parseFloat(value).toLocaleString()}`;
  };

  const formatChange = (value?: number) => {
    if (value === undefined || value === null) return null;
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const statCards = stats ? [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: formatChange(stats.revenueChangePercent),
      trend: !stats.revenueChangePercent || stats.revenueChangePercent >= 0 ? "up" : "down",
      icon: <DollarSign className="h-4 w-4" />,
      href: "/admin/orders",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      change: formatChange(stats.ordersChangePercent),
      trend: !stats.ordersChangePercent || stats.ordersChangePercent >= 0 ? "up" : "down",
      icon: <ShoppingBag className="h-4 w-4" />,
      href: "/admin/orders",
    },
    {
      title: "Total Bookings",
      value: stats.totalBookings.toString(),
      change: `${stats.pendingBookings} pending`,
      trend: "neutral",
      icon: <Calendar className="h-4 w-4" />,
      href: "/admin/bookings",
    },
    {
      title: "Total Products",
      value: stats.totalProducts.toString(),
      change: null,
      trend: "neutral",
      icon: <Package className="h-4 w-4" />,
      href: "/admin/products",
    },
  ] : [];


  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
            <Button className="mt-4" onClick={fetchAnalytics}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your admin panel. Here's what's happening.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className="rounded-full bg-secondary p-2">{stat.icon}</div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.change && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {stat.trend === "up" && (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">{stat.change}</span>
                      <span>from last period</span>
                    </>
                  )}
                  {stat.trend === "down" && (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">{stat.change}</span>
                      <span>from last period</span>
                    </>
                  )}
                  {stat.trend === "neutral" && (
                    <span>{stat.change}</span>
                  )}
                </div>
              )}
              <Link href={stat.href}>
                <Button variant="link" size="sm" className="mt-2 h-auto p-0">
                  View all
                  <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your store</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No orders or bookings yet. New ones will appear here as they come in.
              </p>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <Link
                    key={`${activity.type}-${activity.id}`}
                    href={activity.type === "order" ? "/admin/orders" : "/admin/bookings"}
                    className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0 hover:opacity-80"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {activity.type === "order" ? (
                        <ShoppingBag className="h-4 w-4" />
                      ) : (
                        <Calendar className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        {timeAgo(activity.createdAt)} · {activity.status.replace(/_/g, " ")} ·{" "}
                        KSh {Number(activity.amount).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/products/new">
              <Button variant="outline" className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </Link>
            <Link href="/admin/bookings">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                View Bookings
              </Button>
            </Link>
            <Link href="/admin/orders">
              <Button variant="outline" className="w-full justify-start">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Manage Orders
              </Button>
            </Link>
            <Link href="/admin/calendar">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Calendar
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
