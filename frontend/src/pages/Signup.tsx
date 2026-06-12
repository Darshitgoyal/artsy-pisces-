import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/api';

export default function Signup() {
  const [step, setStep] = useState<'details' | 'otp'>('details');

  // Step 1 fields
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  // Step 2 field
  const [otp, setOtp] = useState('');

  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate   = useNavigate();
  const { toast }  = useToast();

  // Step 1 — send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { name, email, password });
      toast({ title: 'OTP sent!', description: `Check your inbox at ${email}` });
      setStep('otp');
    } catch (err: any) {
      toast({
        title: 'Failed',
        description: err.response?.data?.error || 'Could not send OTP.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify OTP and create account
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({ title: 'Invalid OTP', description: 'Enter the 6-digit code from your email.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password, otp);
      toast({ title: 'Account created!', description: 'Welcome to Artsy Pisces.' });
      navigate('/');
    } catch (err: any) {
      toast({
        title: 'Verification failed',
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
            {step === 'details' ? 'Create your account' : 'Verify your email'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${step === 'details' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1 Details
          </div>
          <div className="h-px w-6 bg-border" />
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${step === 'otp' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2 Verify Email
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">

          {step === 'details' ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Continue →'}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to<br />
                  <strong className="text-foreground">{email}</strong>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-bold h-14"
                  autoFocus
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </Button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                >
                  ← Change email or resend OTP
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}