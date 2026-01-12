const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { verifyTenantAccess } = require('../middleware/permissions');

router.get('/',
    authenticateToken,
    verifyTenantAccess,
    async (req, res) => {
        try {
            const services = [
                { id: '1', name: "General Wellness", category: "Health", icon: "Stethoscope", color: "text-purple-600", bg: "bg-purple-100", price: "$150.00", duration: "60 min", status: "Active" },
                { id: '2', name: "Workspace Usage", category: "Facilities", icon: "Wifi", color: "text-blue-600", bg: "bg-blue-100", price: "$25.00/hr", duration: "Flexible", status: "Active" },
                { id: '3', name: "Luggage Storage", category: "Concierge", icon: "Briefcase", color: "text-orange-600", bg: "bg-orange-100", price: "$10.00", duration: "Daily", status: "Active" },
                { id: '4', name: "Concierge Consult", category: "Support", icon: "Coffee", color: "text-emerald-600", bg: "bg-emerald-100", price: "$0.00", duration: "15 min", status: "Active" },
                { id: '5', name: "Event Hosting", category: "Events", icon: "Users", color: "text-rose-600", bg: "bg-rose-100", price: "Custom", duration: "Varies", status: "Inactive" },
            ];

            res.json({
                success: true,
                services
            });
        } catch (error) {
            console.error('Error fetching services:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch services'
            });
        }
    });

module.exports = router;
