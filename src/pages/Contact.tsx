import React, { useState } from 'react';
import { Phone, Mail, MessageCircle, Clock, MapPin, Send } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handlePhoneClick = () => {
    window.location.href = 'tel:9361284773';
  };

  const handleWhatsAppClick = () => {
    const message = formData.name && formData.phone 
      ? `Hi, I'm ${formData.name} (${formData.phone}). ${formData.message || 'I have a query about your products.'}`
      : 'Hi, I have a query about your products.';
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/919361284773?text=${encodedMessage}`, '_blank');
  };

  const handleEmailClick = () => {
    window.location.href = 'mailto:puthiyamproduct@gmail.com';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        title: "Required fields missing",
        description: "Please fill in your name and phone number",
        variant: "destructive"
      });
      return;
    }
    handleWhatsAppClick();
  };

  const contactMethods = [
    {
      icon: Phone,
      title: 'Call Us',
      description: '9361284773',
      action: handlePhoneClick,
      buttonText: 'Call Now',
      color: 'bg-secondary'
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      description: 'Quick response guaranteed',
      action: handleWhatsAppClick,
      buttonText: 'Chat Now',
      color: 'bg-secondary'
    },
    {
      icon: Mail,
      title: 'Email',
      description: 'puthiyamproduct@gmail.com',
      action: handleEmailClick,
      buttonText: 'Send Email',
      color: 'bg-primary'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <section className="mb-12 text-center">
          <div className="gradient-hero rounded-2xl p-8 md:p-12 text-primary-foreground">
            <h1 className="font-serif text-3xl md:text-5xl font-bold mb-4 animate-fade-in">
              Contact Us
            </h1>
            <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto">
              We're here to help! Reach out to us anytime.
            </p>
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Contact Methods */}
          <div className="space-y-6">
            <h2 className="font-serif text-2xl font-bold">Get in Touch</h2>
            
            {contactMethods.map((method, index) => (
              <Card key={index} className="shadow-soft hover:shadow-elevated transition-shadow animate-fade-in">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 ${method.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <method.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{method.title}</h3>
                      <p className="text-muted-foreground text-sm mb-3">{method.description}</p>
                      <Button
                        onClick={method.action}
                        variant="outline"
                        className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                      >
                        {method.buttonText}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Business Hours */}
            <Card className="shadow-soft">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Business Hours</h3>
                    <p className="text-muted-foreground text-sm">
                      Monday - Saturday: 9:00 AM - 8:00 PM<br />
                      Sunday: 10:00 AM - 6:00 PM
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="font-serif">Send us a Message</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Your Name *</label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone Number *</label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Your phone number"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message</label>
                    <Textarea
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="How can we help you?"
                      rows={4}
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-hero text-primary-foreground">
                    <Send className="w-4 h-4 mr-2" />
                    Send via WhatsApp
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
