const ctaService = {
    getDirections(userMessage) {
        const lowerMsg = userMessage.toLowerCase();

        if (lowerMsg.includes('airport') || lowerMsg.includes('ord') || lowerMsg.includes('mdw') || lowerMsg.includes('o\'hare') || lowerMsg.includes('midway')) {
            if (lowerMsg.includes('ord') || lowerMsg.includes('o\'hare')) {
                return "If you arrive at O'Hare International Airport (ORD):\n\n- Take the CTA Blue Line from O’Hare station (lower-level concourse).\n- Ride about 40–45 minutes to downtown.\n- Get off at Washington/Wabash station.\n- Walk to 111 N Wabash Ave, which is a short distance from the station.\n\nBackup Options:\n\n- Taxi or rideshare directly to 111 N Wabash Ave\n- Airport shuttle or private car service, especially for late-night arrivals or heavy luggage";
            }
            if (lowerMsg.includes('mdw') || lowerMsg.includes('midway')) {
                return "If you arrive at Midway International Airport (MDW):\n\n- Take the CTA Orange Line toward downtown.\n- Ride about 20–25 minutes.\n- Get off at Washington/Wabash or any nearby Loop station.\n- Walk to 111 N Wabash Ave.\n\nBackup Options:\n\n- Taxi or rideshare directly to 111 N Wabash Ave";
            }
            return "Are you coming from O'Hare (ORD) or Midway (MDW)? I can give you specific train directions to our downtown office for either one!";
        }

        return null;
    }
};

module.exports = ctaService;
