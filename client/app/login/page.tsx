"use client";
import React from 'react';
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { AlertCircle } from "lucide-react";

import { GitHubIcon } from "@/components/icons/github-icon";
import { BrandMark } from "@/components/layout/app-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { getGithubLoginUrl } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-auth';

function LoginLoading(){
    return (
        <div className="flex min-h-svh items-center justify-center">
                <Spinner className="size-8"/>
        </div>
    )
}

import ModernLoginSignup from "@/components/ui/modern-login-signup";

const LoginContent = () => {
  const params = useSearchParams();
  const router = useRouter();
  const error = params.get("error");
  const next = params.get("next") || "/dashboard";
  const { data: user, isLoading } = useCurrentUser();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(next.startsWith("/") ? next : "/dashboard");
    }
  }, [user, isLoading, next, router]);

  return (
    <>
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
          <Alert variant="destructive" className="bg-red-950/90 border-red-900 text-white backdrop-blur-md">
            <AlertCircle className="text-red-400" />
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>Please try again.</AlertDescription>
          </Alert>
        </div>
      )}
      <ModernLoginSignup />
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}