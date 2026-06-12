import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function ForgotPassword() {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail]           = useState('');
  const [otp, setOtp]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading]       = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1 — send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      toast({ title: 'OTP sent!', description: `Check your inbox at ${email}` });
      setStep('otp');
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || 'Could not send OTP.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { email, otp, newPassword });
      toast({ title: 'Password reset!', description: 'You can now log in with your new password.' });
      navigate('/login');
    } catch (err: any) {
      toast({
        title: 'Reset failed',
        description: err.response?.data?.error || 'Invalid or expired OTP.',
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
            {step === 'email' ? 'Reset your password' : 'Enter your new password'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className={`text-xs font-medium px-3 py-1 rounded-full ${step === 'email' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1 Enter Email
          </div>
          <div className="h-px w-6 bg-border" />
          <div className={`text-xs font-medium px-3 py-1 rounded-full ${step === 'otp' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
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
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP →'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-sm text-muted-foreground">
                  OTP sent to <strong className="text-foreground">{email}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">6-Digit OTP</Label>
                <Input
                  id="otp"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                  onChange={e => setNewPassword(e.target.value)}
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
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  ← Use a different email
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}