import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function ForgotPassword() {
  const [step, setStep]                       = useState<'email' | 'otp'>('email');
  const [email, setEmail]                     = useState('');
  const [otp, setOtp]                         = useState('');
  const [devOtp, setDevOtp]                   = useState<string | null>(null);
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]                 = useState(false);
  const [resending, setResending]             = useState(false);
  const [countdown, setCountdown]             = useState(0);

  const navigate  = useNavigate();
  const { toast } = useToast();

  // Cooldown countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Step 1: Send OTP to email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDevOtp(null);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.otp) {
        setDevOtp(res.data.otp);
      }
      toast({
        title: 'Verification Code Sent',
        description: res.data.otp
          ? `Development Code: ${res.data.otp}`
          : `If registered, a code has been sent to ${email}`,
      });
      setStep('otp');
      setCountdown(60);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Could not send verification code.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    try {
      const res = await api.post('/auth/resend-forgot-otp', { email });
      if (res.data.otp) {
        setDevOtp(res.data.otp);
      }
      setCountdown(60);
      toast({
        title: 'New Code Sent',
        description: res.data.otp
          ? `Development Code: ${res.data.otp}`
          : `A new reset code was sent to ${email}`,
      });
    } catch (err: any) {
      toast({
        title: 'Resend Failed',
        description: err.response?.data?.error || 'Could not resend code.',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP and reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.trim().length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the complete 6-digit code.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please ensure both passwords match.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp: otp.trim(), newPassword });
      toast({
        title: 'Password reset successfully',
        description: 'You can now sign in with your new password.',
      });
      navigate('/login');
    } catch (err: any) {
      toast({
        title: 'Reset failed',
        description: err.response?.data?.error || 'Invalid or expired verification code.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-medium italic mb-2">Artsy Pisces</h1>
          <p className="text-muted-foreground text-sm">
            {step === 'email' ? 'Reset your password' : 'Enter verification code & new password'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              step === 'email'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            1 Enter Email
          </div>
          <div className="h-px w-6 bg-border" />
          <div
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              step === 'otp'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            2 Verify & Reset
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {step === 'email' ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Registered Email</Label>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Verification Code →'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-sm text-muted-foreground">
                  Verification code sent to <strong className="text-foreground">{email}</strong>
                </p>

                {devOtp && (
                  <div className="mt-2.5 p-2 bg-muted/60 border border-border rounded-lg text-xs">
                    <span className="text-muted-foreground">Dev Mode OTP: </span>
                    <strong className="font-mono text-primary tracking-widest">{devOtp}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit Verification Code</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || otp.length !== 6}>
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>

              <div className="flex flex-col gap-2 pt-2 text-center text-xs">
                <div>
                  {countdown > 0 ? (
                    <span className="text-muted-foreground">
                      Resend code in <span className="font-medium text-foreground">{countdown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={resending}
                      className="text-primary hover:underline font-medium disabled:opacity-50"
                    >
                      {resending ? 'Sending...' : 'Didn’t receive code? Resend Code'}
                    </button>
                  )}
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setOtp('');
                      setDevOtp(null);
                    }}
                    className="text-muted-foreground hover:text-foreground underline pt-1"
                  >
                    ← Use a different email
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