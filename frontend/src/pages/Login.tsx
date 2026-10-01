import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const [step, setStep]         = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp]           = useState('');
  const [devOtp, setDevOtp]     = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { login, verifyLoginOtp, resendLoginOtp } = useAuth();
  const navigate  = useNavigate();
  const { toast } = useToast();

  // Countdown timer for resend OTP cooldown
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Step 1: Submit credentials (Email + Password)
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDevOtp(null);

    try {
      const result = await login(email, password);

      if (result.otpRequired) {
        if (result.otp) {
          setDevOtp(result.otp);
        }
        setStep('otp');
        setCountdown(60);
        toast({
          title: 'Verification Code Sent',
          description: result.otp
            ? `Development Code: ${result.otp}`
            : `Please check your inbox at ${email}`,
        });
      } else if (result.user) {
        // Direct login if OTP not required
        handleRedirect(result.user.role);
      }
    } catch (err: any) {
      toast({
        title: 'Login failed',
        description: err.response?.data?.error || 'Invalid email or password.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify received OTP
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.trim().length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the complete 6-digit verification code.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const user = await verifyLoginOtp(email, otp.trim());
      toast({
        title: 'Signed in successfully',
        description: `Welcome back, ${user.name}!`,
      });
      handleRedirect(user.role);
    } catch (err: any) {
      toast({
        title: 'Verification failed',
        description: err.response?.data?.error || 'Invalid or expired verification code.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    try {
      const res = await resendLoginOtp(email);
      setCountdown(60);
      if (res.otp) {
        setDevOtp(res.otp);
      }
      toast({
        title: 'New Code Sent',
        description: res.otp
          ? `Development Code: ${res.otp}`
          : `A new verification code was sent to ${email}`,
      });
    } catch (err: any) {
      toast({
        title: 'Resend failed',
        description: err.response?.data?.error || 'Could not resend verification code.',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  const handleRedirect = (role?: string) => {
    if (role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-medium italic mb-2">Artsy Pisces</h1>
          <p className="text-muted-foreground text-sm">
            {step === 'credentials' ? 'Sign in to your account' : 'Two-Factor Email Verification'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
              step === 'credentials'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            1 Credentials
          </div>
          <div className="h-px w-6 bg-border" />
          <div
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${
              step === 'otp'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            2 Email OTP
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {step === 'credentials' ? (
            /* Step 1: Email & Password */
            <form onSubmit={handleCredentialsSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Sign In →'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary hover:underline font-medium">
                  Sign up
                </Link>
              </p>
            </form>
          ) : (
            /* Step 2: OTP Verification */
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div className="text-center mb-3">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit verification code to
                </p>
                <p className="font-medium text-foreground text-sm mt-0.5">{email}</p>

                {devOtp && (
                  <div className="mt-3 p-2.5 bg-muted/60 border border-border rounded-lg text-xs">
                    <span className="text-muted-foreground">Dev Mode OTP: </span>
                    <strong className="font-mono text-primary tracking-widest">{devOtp}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                  autoFocus
                  required
                />
                <p className="text-[12px] text-muted-foreground text-center">
                  Code expires in 10 minutes
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>

              {/* Resend & Back controls */}
              <div className="flex flex-col gap-2 pt-2 text-center text-xs">
                <div>
                  {countdown > 0 ? (
                    <span className="text-muted-foreground">
                      Resend code in <span className="font-medium text-foreground">{countdown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="text-primary hover:underline font-medium disabled:opacity-50"
                    >
                      {resending ? 'Sending...' : 'Didn’t receive code? Resend OTP'}
                    </button>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('credentials');
                      setOtp('');
                      setDevOtp(null);
                    }}
                    className="text-muted-foreground hover:text-foreground underline pt-1"
                  >
                    ← Use different credentials
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}