import React from 'react';
import { Heart, Truck, Shield, Star } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import { Card, CardContent } from '@/components/ui/card';

const About: React.FC = () => {
  const features = [
    {
      icon: Heart,
      title: 'Made with Love',
      description: 'Every product is carefully selected and packed with care to ensure you get the best quality.'
    },
    {
      icon: Shield,
      title: 'Quality Assured',
      description: 'We source only the finest products from trusted suppliers to maintain our high standards.'
    },
    {
      icon: Truck,
      title: 'Fast Delivery',
      description: 'Quick and reliable delivery to your doorstep. Free shipping on orders above ₹200!'
    },
    {
      icon: Star,
      title: 'Customer First',
      description: 'Your satisfaction is our priority. We\'re always here to help with any questions.'
    }
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <section className="mb-12 text-center">
          <div className="gradient-hero rounded-2xl p-8 md:p-12 text-primary-foreground">
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-4 animate-fade-in">
              About PUTHIYAM PRODUCTS
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
              Your trusted partner for authentic, quality products since day one.
            </p>
          </div>
        </section>

        {/* Story */}
        <section className="mb-16 max-w-3xl mx-auto">
          <Card className="shadow-soft">
            <CardContent className="p-8">
              <h2 className="font-serif text-2xl font-bold mb-4 text-center">Our Story</h2>
              <div className="prose prose-muted max-w-none text-center">
                <p className="text-muted-foreground leading-relaxed">
                  PUTHIYAM PRODUCTS was born from a simple idea: to bring quality, authentic products 
                  directly to your doorstep. We believe that everyone deserves access to genuine, 
                  high-quality groceries, spices, and everyday essentials without compromising on 
                  quality or convenience.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  What started as a small family venture has grown into a trusted name in our community. 
                  We personally select each product, ensuring it meets our strict quality standards 
                  before it reaches you. Our commitment to excellence and customer satisfaction 
                  drives everything we do.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  Thank you for choosing PUTHIYAM PRODUCTS. We're honored to be part of your 
                  daily life and promise to continue delivering excellence, one product at a time.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="font-serif text-2xl font-bold mb-8 text-center">Why Choose Us?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-soft hover:shadow-elevated transition-shadow animate-fade-in">
                <CardContent className="p-6 text-center">
                  <div className="w-14 h-14 gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-serif font-semibold text-lg mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-2xl font-bold mb-4">Our Mission</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            To provide every household with access to premium quality products at fair prices, 
            while building lasting relationships based on trust, transparency, and exceptional service.
          </p>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
};

export default About;
