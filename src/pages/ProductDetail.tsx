import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Send, Star, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { products } from '@/data/products';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/context/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import ImageSlideshow from '@/components/ImageSlideshow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ProductVariant } from '@/types/product';

interface Review {
  id: string;
  user_id: string;
  user_name: string;
  rating: number;
  comment: string | null;
  image_url: string | null;
  created_at: string;
}

const ADMIN_EMAIL = 'subavignesh33@gmail.com';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const product = products.find(p => p.id === id);

  // Generate additional product images
  const productImages = product ? [
    product.image,
    product.image.replace('w=400', 'w=500'),
    product.image.replace('w=400', 'w=600'),
  ] : [];

  useEffect(() => {
    if (id) {
      fetchReviews();
    }
  }, [id]);

  useEffect(() => {
    if (product?.variants && product.variants.length > 0 && !selectedVariant) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product, selectedVariant]);

  useEffect(() => {
    // Check if current user is admin
    if (user?.email === ADMIN_EMAIL) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  const fetchReviews = async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setReviews(data);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image under 5MB",
          variant: "destructive"
        });
        return;
      }
      setReviewImage(file);
      setReviewImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadReviewImage = async (): Promise<string | null> => {
    if (!reviewImage || !user) return null;

    const fileExt = reviewImage.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('review-images')
      .upload(fileName, reviewImage);

    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('review-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to submit a review",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    if (!newReview.comment.trim()) {
      toast({
        title: "Review Required",
        description: "Please write your review",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    let imageUrl = null;
    if (reviewImage) {
      imageUrl = await uploadReviewImage();
    }

    // Get user's display name from profile or email
    const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer';

    const { error } = await supabase.from('reviews').insert({
      product_id: id,
      user_id: user.id,
      user_name: userName,
      rating: newReview.rating,
      comment: newReview.comment,
      image_url: imageUrl,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Review Submitted!",
      description: "Thank you for your feedback",
    });

    setNewReview({ rating: 5, comment: '' });
    setReviewImage(null);
    setReviewImagePreview(null);
    fetchReviews();
  };

  const handleDeleteReview = async (reviewId: string) => {
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Review Deleted",
      description: "The review has been removed",
    });
    fetchReviews();
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    const productToAdd = selectedVariant 
      ? { ...product, price: selectedVariant.price, selectedVariant }
      : product;
    
    addToCart(productToAdd);
  };

  const renderStars = (rating: number, interactive = false, onRate?: (r: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-6 h-6 transition-all duration-200 ${
          i < rating
            ? 'fill-accent text-accent drop-shadow-[0_0_4px_hsl(var(--accent))]'
            : 'text-muted hover:text-accent/50'
        } ${interactive ? 'cursor-pointer hover:scale-125 active:scale-110' : ''}`}
        onClick={() => interactive && onRate && onRate(i + 1)}
      />
    ));
  };

  const currentPrice = selectedVariant?.price || product?.price || 0;

  if (!product) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">Product not found</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            Back to Home
          </Button>
        </main>
        <Footer />
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Product Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div 
              className="aspect-square overflow-hidden rounded-2xl bg-muted cursor-pointer group relative"
              onClick={() => setSlideshowOpen(true)}
            >
              <img
                src={productImages[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
                <span className="bg-white/90 text-foreground px-4 py-2 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                  Tap to view
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {productImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 hover:scale-105 active:scale-95 ${
                    selectedImage === idx 
                      ? 'border-primary shadow-[0_0_10px_hsl(var(--primary))]' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <span className="bg-secondary text-secondary-foreground text-sm px-3 py-1 rounded-full">
                {product.category}
              </span>
              <h1 className="font-serif text-3xl font-bold mt-4 text-foreground">
                {product.name}
              </h1>
            </div>

            <p className="text-muted-foreground text-lg leading-relaxed">
              {product.description}
            </p>

            {/* Weight/Size Variants */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Size</Label>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.weight}
                      onClick={() => setSelectedVariant(variant)}
                      className={`px-4 py-2 rounded-full border-2 font-medium transition-all duration-300 hover:scale-105 active:scale-95 ${
                        selectedVariant?.weight === variant.weight
                          ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.4)]'
                          : 'border-border hover:border-primary/50 bg-background'
                      }`}
                    >
                      {variant.weight} - ₹{variant.price}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="text-muted-foreground">
              {reviews.length} customer {reviews.length === 1 ? 'review' : 'reviews'}
            </div>

            <div className="text-3xl font-bold text-primary animate-pulse-soft">
              ₹{currentPrice}
            </div>

            <Button
              onClick={handleAddToCart}
              className="w-full gradient-hero text-primary-foreground text-lg py-6 hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 shadow-elevated"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add to Cart
            </Button>
          </div>
        </div>

        {/* Reviews Section */}
        <section className="space-y-8">
          <h2 className="font-serif text-2xl font-bold">Customer Reviews</h2>

          {/* Write Review */}
          <Card className="overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold text-lg">Write a Review</h3>
              
              {/* Star Rating */}
              <div className="space-y-2">
                <Label>Your Rating</Label>
                <div className="flex gap-1">
                  {renderStars(newReview.rating, true, (r) => setNewReview(prev => ({ ...prev, rating: r })))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Your Review</Label>
                <Textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your experience with this product..."
                  rows={4}
                  className="transition-all duration-200 focus:shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Add Photo (optional)</Label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-primary/50 transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload Image</span>
                    </div>
                  </label>
                  {reviewImagePreview && (
                    <div className="relative">
                      <img
                        src={reviewImagePreview}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => {
                          setReviewImage(null);
                          setReviewImagePreview(null);
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <Button
                onClick={handleSubmitReview}
                disabled={loading}
                className="gradient-hero text-primary-foreground hover:scale-105 active:scale-95 transition-transform"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? 'Submitting...' : 'Submit Review'}
              </Button>
            </CardContent>
          </Card>

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No reviews yet. Be the first to review this product!
              </p>
            ) : (
              reviews.map((review) => (
                <Card key={review.id} className="overflow-hidden animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">{review.user_name}</p>
                        <div className="flex gap-0.5 mt-1">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                        {/* Admin delete button or user's own review delete */}
                        {(isAdmin || user?.id === review.user_id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {review.image_url && (
                      <img
                        src={review.image_url}
                        alt="Review"
                        className="w-full max-w-xs rounded-lg mb-2 cursor-pointer hover:scale-[1.02] transition-transform"
                        onClick={() => window.open(review.image_url!, '_blank')}
                      />
                    )}
                    {review.comment && (
                      <p className="text-muted-foreground">{review.comment}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />

      {/* Image Slideshow Modal */}
      <ImageSlideshow
        images={productImages}
        initialIndex={selectedImage}
        isOpen={slideshowOpen}
        onClose={() => setSlideshowOpen(false)}
      />
    </div>
  );
};

export default ProductDetail;
