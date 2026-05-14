import { BookingForm } from "@/components/store/appointments/booking-form";
import { Calendar } from "lucide-react";

export const metadata = {
  title: "Book an Appointment | MiDuka Optician",
  description: "Schedule your eye test, frame fitting, or consultation online.",
};

export default function BookingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/30">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full mb-6 border border-white/20">
            <Calendar className="w-5 h-5" />
            <span className="text-sm font-semibold uppercase tracking-wider">Appointment Booking</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            See the World More <span className="text-blue-300">Clearly</span>
          </h1>
          <p className="text-xl md:text-2xl opacity-90 max-w-2xl mx-auto mb-8 font-medium">
            Professional eye care tailored to your lifestyle. Book your visit in less than 2 minutes.
          </p>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-400 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Booking Form Section */}
      <section className="container mx-auto px-4 -mt-16 relative z-20">
        <BookingForm />
      </section>

      {/* Why Choose Us? */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Why Book With Us?</h2>
            <div className="w-20 h-1.5 bg-primary mx-auto rounded-full" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-8 rounded-[2rem] bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Expert Optometrists</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our team uses state-of-the-art diagnostic technology for precise results.
              </p>
            </div>
            
            <div className="p-8 rounded-[2rem] bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">No Waiting Time</h3>
              <p className="text-muted-foreground leading-relaxed">
                We value your time. Our appointment system ensures you&apos;re seen promptly.
              </p>
            </div>
            
            <div className="p-8 rounded-[2rem] bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Glasses className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-3">Curated Frames</h3>
              <p className="text-muted-foreground leading-relaxed">
                Browse our exclusive collection of designer and artisanal eyewear.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Re-using icons from booking form
function Search({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  );
}

function Glasses({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="6" cy="15" r="3"/><circle cx="18" cy="15" r="3"/><path d="M17 15a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2"/><path d="M3 13V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/></svg>
  );
}
