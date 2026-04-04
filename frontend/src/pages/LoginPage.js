import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
const HERO_IMAGE =
  "https://static.prod-images.emergentagent.com/jobs/5b6840bb-1870-435d-9e66-a5d8a6303d8c/images/c08b59b1e3fc6bdb06f89ec5487c3b7b1826dd77b0e159d797cf701a6eb16e44.png";
export default function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" data-testid="login-page">
      {/* Left: Hero Image */}
      <div
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <h2 className="text-3xl font-heading font-light text-white tracking-tight mb-2">
            Financial clarity,
            <br />
            <span className="font-semibold">simplified.</span>
          </h2>
          <p className="text-white/70 text-sm max-w-sm">
            Track income, expenses, and trends with role-based access and
            real-time dashboards.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-stone-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:mb-12">
            <div className="w-8 h-8 rounded-sm bg-moss flex items-center justify-center">
              <span className="text-white text-sm font-bold font-heading">
                F
              </span>
            </div>
            <span className="font-heading font-semibold text-stone-800 text-xl tracking-tight">
              Fiscal
            </span>
          </div>

          <Card className="border-stone-200 shadow-none bg-white rounded-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-heading font-semibold text-stone-800 tracking-tight">
                {isRegister ? "Create account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-stone-500 text-sm">
                {isRegister
                  ? "Enter your details to get started"
                  : "Sign in to your finance dashboard"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegister && (
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-xs font-semibold tracking-wide uppercase text-stone-500"
                    >
                      Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      required={isRegister}
                      className="rounded-sm border-stone-300 focus:border-moss focus:ring-moss/30"
                      data-testid="register-name-input"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label
                    htmlFor="email"
                    className="text-xs font-semibold tracking-wide uppercase text-stone-500"
                  >
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    required
                    className="rounded-sm border-stone-300 focus:border-moss focus:ring-moss/30"
                    data-testid="login-email-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="password"
                    className="text-xs font-semibold tracking-wide uppercase text-stone-500"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Min 6 characters"
                      required
                      minLength={isRegister ? 6 : undefined}
                      className="rounded-sm border-stone-300 focus:border-moss focus:ring-moss/30 pr-10"
                      data-testid="login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      data-testid="toggle-password-btn"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    className="text-sm text-terracotta bg-terracotta/5 border border-terracotta/20 rounded-sm px-3 py-2"
                    data-testid="auth-error"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-sm bg-moss hover:bg-moss-hover text-white font-medium transition-all duration-200 active:scale-[0.98]"
                  data-testid="login-submit-btn"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {isRegister ? "Create account" : "Sign in"}
                      <ArrowRight size={16} className="ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setError("");
                  }}
                  className="text-sm text-stone-500 hover:text-moss transition-colors"
                  data-testid="toggle-auth-mode-btn"
                >
                  {isRegister
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Create one"}
                </button>
              </div>

              {/* Demo credentials hint */}
              {!isRegister && (
                <div className="mt-4 p-3 bg-stone-50 rounded-sm border border-stone-200">
                  <p className="text-xs text-stone-500 font-medium mb-1.5">
                    Demo Credentials
                  </p>
                  <div className="space-y-1 text-xs text-stone-400 font-mono">
                    <p>Admin: admin@example.com / admin123</p>
                    <p>Analyst: analyst@example.com / analyst123</p>
                    <p>Viewer: viewer@example.com / viewer123</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
