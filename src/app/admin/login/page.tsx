"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import styles from "../admin.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.replace("/admin");
      router.refresh();
    } else {
      setError("Wrong password. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className={styles.loginWrap}>
      <div className={styles.loginCard}>
        <div className={styles.loginTop}>
          <Image src="/logo.png" alt="Be Beauty" width={360} height={270} priority />
        </div>
        <form className={styles.loginForm} onSubmit={submit}>
          <h1>Welcome back</h1>
          <p>Sign in to see your bookings</p>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          {error && <div className={styles.error}>{error}</div>}
          <button className="btn btn-primary" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
