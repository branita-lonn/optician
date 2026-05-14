import { addMinutes, format, isBefore, startOfDay, setHours, setMinutes } from "date-fns";

function generateTimeSlots(selectedDate: Date, duration: number) {
  const slots = [];
  let current = setMinutes(setHours(startOfDay(selectedDate), 9), 0); // Start at 9:00 AM
  const end = setMinutes(setHours(startOfDay(selectedDate), 17), 0); // End at 5:00 PM
  
  while (isBefore(current, end)) {
    const timeStr = format(current, "HH:mm");
    const slotEnd = addMinutes(current, duration);
    
    // Slot must end by 17:00
    if (isBefore(slotEnd, addMinutes(end, 1))) {
      slots.push(timeStr);
    }
    current = addMinutes(current, 15); // 15-min intervals
  }
  return slots;
}

const testDate = new Date();
const eyeTestDuration = 45;
const slots = generateTimeSlots(testDate, eyeTestDuration);

console.log("Slots for 45-min Eye Test:");
console.log(slots);
console.log("Last slot:", slots[slots.length - 1]);

if (slots[slots.length - 1] === "16:15") {
  console.log("SUCCESS: Last slot is 16:15");
} else {
  console.log("FAILURE: Last slot is", slots[slots.length - 1]);
}
