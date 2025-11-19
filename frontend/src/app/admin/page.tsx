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

export default function AdminDashboard() {
  const { isAdmin, loading: authLoading } = useRequireAdmin();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAdmin) {
      fetchAnalytics();
    }
  }, [isAdmin]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      const session = await fetch("/api/auth/session").then(res => res.json());
      const token = session?.user?.accessToken;

      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await axios.get<OverviewStats>(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/analytics/overview`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setStats(response.data);
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      setError(err.response?.data?.detail || "Failed to load analytics");
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

  const recentActivity = [
    {
      id: 1,
      type: "order",
      message: "New order #1234 placed",
      time: "2 minutes ago",
    },
    {
      id: 2,
      type: "booking",
      message: "Booking confirmed for tomorrow",
      time: "15 minutes ago",
    },
    {
      id: 3,
      type: "product",
      message: "Product stock updated",
      time: "1 hour ago",
    },
  ];

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
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {activity.type === "order" && <ShoppingBag className="h-4 w-4" />}
                    {activity.type === "booking" && <Calendar className="h-4 w-4" />}
                    {activity.type === "product" && <Package className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
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
