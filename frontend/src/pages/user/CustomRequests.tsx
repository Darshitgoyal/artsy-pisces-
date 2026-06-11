import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Image as ImageIcon, 
  ArrowLeft, 
  ShoppingBag,
  Sparkles,
  RefreshCw,
  FolderSync
} from 'lucide-react';
import api from '@/lib/api';

interface CustomRequest {
  id: number;
  user_id: string;
  description: string;
  reference_image_url: string | null;
  status: 'pending' | 'approved' | 'declined' | 'completed';
  price: number | null;
  created_at: string;
}

const statusBadgeColor: Record<string, string> = {
  pending:   'bg-yellow-50 border-yellow-200 text-yellow-700',
  approved:  'bg-green-50 border-green-200 text-green-700',
  declined:  'bg-red-50 border-red-200 text-red-700',
  completed: 'bg-blue-50 border-blue-200 text-blue-700',
};

const statusIcon = (status: string) => {
  switch (status) {
    case 'pending':   return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'approved':  return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'declined':  return <XCircle className="h-4 w-4 text-red-600" />;
    case 'completed': return <FolderSync className="h-4 w-4 text-blue-600" />;
    default:          return <Clock className="h-4 w-4" />;
  }
};

export default function CustomRequests() {
  const { user } = useAuth();
  const { addToCart, cart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customizations/mine');
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Could not load your custom requests.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast({ title: 'Validation error', description: 'Please describe your custom design requirements.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      }

      await api.post('/customizations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast({ title: 'Success', description: 'Your custom artwork request has been submitted!' });
      setDescription('');
      setImageFile(null);
      setShowForm(false);
      fetchRequests();
    } catch (err: any) {
      toast({ 
        title: 'Submission failed', 
        description: err.response?.data?.error || 'Could not submit request.', 
        variant: 'destructive' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePlaceOrder = (req: CustomRequest) => {
    if (!req.price) return;
    
    // Add custom artwork as a temporary cart item
    const customArtwork = {
      id: `custom_${req.id}`,
      title: `Custom Art: ${req.description.slice(0, 35)}${req.description.length > 35 ? '...' : ''}`,
      price: Number(req.price),
      image_url: req.reference_image_url || 'https://via.placeholder.com/600x400',
      category: 'Custom Request',
      available: true,
      description: req.description,
      my_quote: req.description
    };

    addToCart(customArtwork);
    toast({ title: 'Added to cart!', description: 'Your custom artwork has been added to your cart.' });
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      
      {/* Header Bar */}
      <div className="bg-white border-b px-6 py-4 shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-1.5 text-sm">
              <ArrowLeft className="h-4 w-4" /> Gallery
            </button>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800 text-sm">Custom Requests</span>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="gap-1.5">
            {showForm ? 'View My Requests' : 'Request Custom Art'}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        
        {/* NEW REQUEST FORM */}
        {showForm ? (
          <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b pb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-slate-800">Request Custom Artwork</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="desc">Artwork Requirements *</Label>
                <textarea 
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe details like canvas size, color palette, reference style, subject matter, or message..."
                  rows={5}
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Reference Image Upload */}
              <div className="space-y-1.5">
                <Label>Reference Image (Optional)</Label>
                <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center bg-slate-50 gap-2 border-slate-200">
                  <Label className="text-slate-600 font-semibold cursor-pointer text-center w-full">
                    📁 Choose File or Drop Image Here
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      className="hidden" 
                    />
                  </Label>
                  {imageFile ? (
                    <p className="text-xs text-primary font-bold">Selected: {imageFile.name}</p>
                  ) : (
                    <p className="text-[10px] text-slate-400">Supported formats: JPG, PNG, WEBP</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" disabled={submitting} className="flex-1 h-11">
                  {submitting ? 'Uploading & Submitting...' : 'Submit Request'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="h-11">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          /* MY CUSTOM REQUESTS LIST */
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">My Custom Artworks</h2>
              <p className="text-slate-500 text-sm">Submit your ideas and track admin approvals/price quotes.</p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map(i => (
                  <div key={i} className="h-32 rounded-2xl bg-white border animate-pulse" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white border rounded-2xl p-12 text-center text-slate-500 shadow-sm space-y-4">
                <Sparkles className="mx-auto h-12 w-12 text-slate-300" />
                <div>
                  <h3 className="font-semibold text-slate-700">No requests yet</h3>
                  <p className="text-sm text-slate-400 mt-1">Have a special idea in mind? Let the artist design it for you!</p>
                </div>
                <Button onClick={() => setShowForm(true)}>Submit New Request</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(req => (
                  <div key={req.id} className="bg-white border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row gap-5 items-start justify-between">
                    <div className="flex gap-4 flex-1">
                      {req.reference_image_url ? (
                        <img 
                          src={req.reference_image_url} 
                          alt="Reference" 
                          className="w-20 h-20 object-cover rounded-lg border flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-slate-100 flex items-center justify-center rounded-lg border text-slate-300 flex-shrink-0">
                          <ImageIcon className="h-8 w-8" />
                        </div>
                      )}
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">Request #{req.id}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold capitalize flex items-center gap-1 ${statusBadgeColor[req.status]}`}>
                            {statusIcon(req.status)} {req.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 whitespace-pre-line pr-4">{req.description}</p>
                        <p className="text-[10px] text-slate-400">Submitted: {new Date(req.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>

                    {/* Action Block */}
                    <div className="w-full md:w-auto flex flex-col items-end gap-2 self-stretch justify-between border-t md:border-t-0 pt-3 md:pt-0">
                      <div className="text-right">
                        {req.price ? (
                          <div>
                            <span className="text-[10px] uppercase text-slate-400 font-bold block">Quoted Price</span>
                            <span className="text-xl font-black text-primary">₹{Number(req.price).toLocaleString('en-IN')}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-400">Price quote pending...</span>
                        )}
                      </div>

                      {req.status === 'approved' && (
                        <Button onClick={() => handlePlaceOrder(req)} size="sm" className="w-full md:w-auto gap-1.5 shadow-md">
                          <ShoppingBag className="h-4 w-4" /> Place Order
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
