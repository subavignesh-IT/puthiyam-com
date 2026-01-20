import React, { useState } from 'react';
import { Star, Upload, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  image?: string;
  date: string;
}

const sampleReviews: Review[] = [
  {
    id: '1',
    customerName: 'Priya M.',
    rating: 5,
    comment: 'Excellent quality products! The turmeric powder is so fresh and aromatic.',
    date: '2024-01-15'
  },
  {
    id: '2',
    customerName: 'Rajesh K.',
    rating: 4,
    comment: 'Good packaging and fast delivery. Will order again.',
    date: '2024-01-10'
  }
];

const ReviewSection: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>(sampleReviews);
  const [newReview, setNewReview] = useState({
    name: '',
    rating: 0,
    comment: '',
    image: null as File | null
  });
  const [hoverRating, setHoverRating] = useState(0);

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
      setNewReview(prev => ({ ...prev, image: file }));
    }
  };

  const handleSubmitReview = () => {
    if (!newReview.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }
    if (newReview.rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating",
        variant: "destructive"
      });
      return;
    }
    if (!newReview.comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please write a review",
        variant: "destructive"
      });
      return;
    }

    const review: Review = {
      id: Date.now().toString(),
      customerName: newReview.name,
      rating: newReview.rating,
      comment: newReview.comment,
      image: newReview.image ? URL.createObjectURL(newReview.image) : undefined,
      date: new Date().toISOString().split('T')[0]
    };

    setReviews(prev => [review, ...prev]);
    setNewReview({ name: '', rating: 0, comment: '', image: null });
    
    toast({
      title: "Thank you! 🙏",
      description: "Your review has been submitted",
    });
  };

  const renderStars = (rating: number, interactive = false, size = 'w-5 h-5') => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${size} cursor-${interactive ? 'pointer' : 'default'} transition-colors ${
          i < (interactive ? (hoverRating || newReview.rating) : rating)
            ? 'fill-accent text-accent'
            : 'text-muted'
        }`}
        onClick={interactive ? () => setNewReview(prev => ({ ...prev, rating: i + 1 })) : undefined}
        onMouseEnter={interactive ? () => setHoverRating(i + 1) : undefined}
        onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Submit Review */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Write a Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Name</label>
            <Input
              value={newReview.name}
              onChange={(e) => setNewReview(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter your name"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Rating</label>
            <div className="flex gap-1">
              {renderStars(newReview.rating, true)}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Your Review</label>
            <Textarea
              value={newReview.comment}
              onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Share your experience..."
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Upload Photo (optional)</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors">
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {newReview.image ? newReview.image.name : 'Choose file'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <Button onClick={handleSubmitReview} className="gradient-hero text-primary-foreground">
            <Send className="w-4 h-4 mr-2" />
            Submit Review
          </Button>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        <h3 className="font-serif text-xl font-semibold">Customer Reviews</h3>
        {reviews.map(review => (
          <Card key={review.id} className="animate-fade-in">
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">{review.customerName}</p>
                  <div className="flex gap-0.5 mt-1">
                    {renderStars(review.rating, false, 'w-4 h-4')}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
              {review.image && (
                <img
                  src={review.image}
                  alt="Review"
                  className="mt-3 rounded-lg max-w-[200px] h-auto"
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ReviewSection;
