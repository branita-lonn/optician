"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  format, 
  addDays, 
  startOfDay, 
  addMinutes, 
  isSameDay,
  isBefore,
  setHours,
  setMinutes
} from "date-fns";
import { 
  Clock, 
  User, 
  ChevronRight, 
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  Glasses,
  Search,
  Package,
  History,
  Phone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";

const APPOINTMENT_TYPES = [
  { id: "EYE_TEST", label: "Eye Test", icon: Eye, duration: 45, description: "Comprehensive eye examination with our optometrist." },
  { id: "FRAME_FITTING", label: "Frame Fitting", icon: Glasses, duration: 30, description: "Professional help choosing and fitting your perfect frames." },
  { id: "CONTACT_LENS_CONSULTATION", label: "Contact Lenses", icon: Search, duration: 45, description: "Fitting and consultation for new or existing contact lens wearers." },
  { id: "COLLECTION", label: "Order Collection", icon: Package, duration: 15, description: "Pick up your ready glasses or contact lenses." },
  { id: "FOLLOW_UP", label: "Follow-up", icon: History, duration: 30, description: "Post-consultation check or adjustment." },
];

export function BookingForm() {
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [selectedType, setSelectedType] = useState(APPOINTMENT_TYPES[0]);
  const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 1));
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    if (session?.user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(prev => {
        if (prev.name === session.user.name && prev.email === session.user.email) {
          return prev;
        }
        return {
          ...prev,
          name: session.user.name || "",
          email: session.user.email || "",
        };
      });
    }
  }, [session]);

  const generateTimeSlots = () => {
    const slots = [];
    let current = setMinutes(setHours(startOfDay(selectedDate), 9), 0); // Start at 9:00 AM
    const end = setMinutes(setHours(startOfDay(selectedDate), 17), 0); // End at 5:00 PM
    
    while (isBefore(current, end)) {
      const timeStr = format(current, "HH:mm");
      const slotEnd = addMinutes(current, selectedType.duration);
      
      // Slot must end by 17:00
      if (isBefore(slotEnd, addMinutes(end, 1))) {
        slots.push(timeStr);
      }
      current = addMinutes(current, 15); // 15-min intervals
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleNext = () => {
    if (step === 1 && !selectedType) {
      toast.error("Please select an appointment type");
      return;
    }
    if (step === 2 && !selectedTime) {
      toast.error("Please select a time slot");
      return;
    }
    setStep(step + 1);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep(step - 1);
    window.scrollTo(0, 0);
  };

  const onSubmit = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill in all contact details");
      return;
    }

    setLoading(true);
    try {
      const [hours, minutes] = (selectedTime || "09:00").split(":").map(Number);
      const scheduledDate = setMinutes(setHours(selectedDate, hours), minutes);

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType.id,
          scheduledDate: scheduledDate.toISOString(),
          notes: formData.notes,
          guestName: formData.name,
          guestEmail: formData.email,
          guestPhone: formData.phone,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Failed to book appointment");
      }

      setStep(4);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to book appointment";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicators = () => (
    <div className="flex justify-between items-center mb-8 max-w-md mx-auto">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all",
            step === s ? "bg-primary text-primary-foreground scale-110 shadow-lg" : 
            step > s ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
          )}>
            {step > s ? <CheckCircle2 className="w-6 h-6" /> : s}
          </div>
          {s < 3 && (
            <div className={cn(
              "h-1 w-12 md:w-20 mx-2 rounded-full transition-colors",
              step > s ? "bg-green-500" : "bg-muted"
            )} />
          )}
        </div>
      ))}
    </div>
  );

  if (step === 4) {
    return (
      <div className="text-center py-12 px-4 animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle2 className="w-16 h-16" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Booking Received!</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          We&apos;ve received your request for a {selectedType.label.toLowerCase()} on {format(selectedDate, "PPP")} at {selectedTime}. 
          We&apos;ll review it and send a confirmation email shortly.
        </p>
        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link href="/account/appointments" className="block w-full">
            <Button className="w-full rounded-full py-6 text-lg">View My Appointments</Button>
          </Link>
          <Link href="/" className="block w-full">
            <Button variant="outline" className="w-full rounded-full py-6 text-lg">Back to Shop</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">
      {renderStepIndicators()}

      <Card className="rounded-[2.5rem] overflow-hidden border shadow-xl bg-card/50 backdrop-blur-sm">
        <CardContent className="p-8 md:p-12">
          
          {/* Step 1: Service Selection */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">What service do you need?</h2>
                <p className="text-muted-foreground">Select the type of appointment you&apos;d like to book.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {APPOINTMENT_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={cn(
                      "flex items-start gap-4 p-6 rounded-3xl border-2 text-left transition-all hover:shadow-md group",
                      selectedType.id === type.id 
                        ? "border-primary bg-primary/5 shadow-inner" 
                        : "border-muted hover:border-primary/30"
                    )}
                  >
                    <div className={cn(
                      "p-3 rounded-2xl transition-colors",
                      selectedType.id === type.id ? "bg-primary text-white" : "bg-muted group-hover:bg-primary/10"
                    )}>
                      <type.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">{type.label}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-semibold text-primary">
                        <Clock className="w-3 h-3" /> {type.duration} mins
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-4">
                <h2 className="text-2xl font-bold mb-2">When should we see you?</h2>
                <p className="text-muted-foreground">Choose a convenient date and time.</p>
              </div>
              
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Date Selection */}
                <div className="flex-1 space-y-4">
                  <Label className="text-lg font-bold">1. Select Date</Label>
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
                    {[...Array(14)].map((_, i) => {
                      const date = addDays(new Date(), i + 1);
                      const isSelected = isSameDay(date, selectedDate);
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setSelectedDate(date);
                            setSelectedTime(null);
                          }}
                          className={cn(
                            "flex flex-col items-center p-3 rounded-2xl border transition-all",
                            isSelected ? "bg-primary text-primary-foreground border-primary shadow-lg" : "hover:border-primary/50 bg-muted/30"
                          )}
                        >
                          <span className="text-xs uppercase opacity-70">{format(date, "EEE")}</span>
                          <span className="text-lg font-bold">{format(date, "d")}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Selection */}
                <div className="flex-1 space-y-4">
                  <Label className="text-lg font-bold">2. Select Time</Label>
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={cn(
                          "py-3 rounded-xl border text-sm font-medium transition-all",
                          selectedTime === time ? "bg-primary text-primary-foreground border-primary shadow-md" : "hover:border-primary/50 bg-muted/30"
                        )}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-700">
                  Store hours are 09:00 AM to 05:00 PM. Last slot for a 45-min Eye Test is 16:15.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Contact Details */}
          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Final details</h2>
                <p className="text-muted-foreground">How can we reach you to confirm your booking?</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="pl-10 h-12 rounded-xl"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Label htmlFor="email" className="absolute left-3 top-3 w-5 h-5 text-muted-foreground flex items-center justify-center">@</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="pl-10 h-12 rounded-xl"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="pl-10 h-12 rounded-xl"
                        placeholder="+254..."
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="min-h-[160px] rounded-2xl resize-none"
                      placeholder="Any specific concerns or history we should know about?"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20 mt-8">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5" /> Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Service</p>
                    <p className="font-semibold">{selectedType.label}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Duration</p>
                    <p className="font-semibold">{selectedType.duration} minutes</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Date</p>
                    <p className="font-semibold">{format(selectedDate, "PPPP")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Time</p>
                    <p className="font-semibold">{selectedTime}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {step < 4 && (
            <div className="flex gap-4 mt-12 pt-8 border-t">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  className="flex-1 h-14 rounded-full border-2 text-lg"
                  disabled={loading}
                >
                  <ChevronLeft className="w-5 h-5 mr-2" /> Back
                </Button>
              )}
              {step < 3 ? (
                <Button
                  onClick={handleNext}
                  className="flex-[2] h-14 rounded-full text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Next Step <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={onSubmit}
                  className="flex-[2] h-14 rounded-full text-lg bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Booking...
                    </span>
                  ) : (
                    <>Confirm Booking <CheckCircle2 className="w-5 h-5 ml-2" /></>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
