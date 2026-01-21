import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 gradient-hero rounded-full flex items-center justify-center">
                <span className="text-primary-foreground font-serif font-bold">P</span>
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg">PUTHIYAM</h3>
                <p className="text-xs text-background/60 -mt-1">PRODUCTS</p>
              </div>
            </div>
            <p className="text-sm text-background/70">
              Quality products delivered with love. Your trusted partner for authentic groceries and essentials.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-background/70 hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-sm text-background/70 hover:text-accent transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-sm text-background/70 hover:text-accent transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/cart" className="text-sm text-background/70 hover:text-accent transition-colors">
                  Cart
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-serif font-semibold mb-4">Contact Us</h4>
            <div className="space-y-3">
              <a
                href="tel:9361284773"
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg text-sm text-background transition-colors"
              >
                <Phone className="w-4 h-4" />
                9361284773
              </a>
              <a
                href="mailto:puthiyamproduct@gmail.com"
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg text-sm text-background transition-colors"
              >
                <Mail className="w-4 h-4" />
                puthiyamproduct@gmail.com
              </a>
              <a
                href="https://wa.me/919361284773"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-secondary/20 hover:bg-secondary/30 rounded-lg text-sm text-background transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-8 pt-8 text-center">
          <p className="text-sm text-background/50">
            © {currentYear} PUTHIYAM PRODUCTS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
