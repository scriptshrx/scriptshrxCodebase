const guideService = {
    getRecommendation(userMessage) {
        const lowerMsg = userMessage.toLowerCase();

        if (lowerMsg.includes('sight') || lowerMsg.includes('visit') || lowerMsg.includes('attraction') || lowerMsg.includes('do in chicago') || lowerMsg.includes('guide')) {
            return "Absolutely! Here are some of the top sights and must-visit attractions in Chicago:\n\n- **Millennium Park & The Bean (Cloud Gate)** — A famous landmark perfect for photos, right in the heart of downtown.\n- **Navy Pier** — A lakeside attraction with restaurants, shops, boat rides, and the iconic Centennial Ferris Wheel.\n- **The Art Institute of Chicago** — One of the world’s best museums, known for its impressive art collections.\n- **Willis Tower Skydeck** — Step onto The Ledge, a glass balcony 1,353 feet above the city.\n- **Magnificent Mile** — Chicago’s premium shopping district with restaurants, boutiques, and high-end stores.\n- **Chicago Riverwalk** — A beautiful walking path along the river with cafes, boat tours, and scenic views.\n- **Shedd Aquarium** — Home to thousands of marine species and incredible underwater exhibits.\n- **Field Museum** — Explore dinosaurs, ancient cultures, and natural history in one of the largest museums in the U.S.\n- **Lincoln Park Zoo** — A free zoo with beautiful grounds and a wide variety of animals.\n\nIf you’d like, I can also give directions, nearby restaurants, travel tips, or recommendations based on how much time you have in the city.";
        }

        return null;
    }
};

module.exports = guideService;
