// utils/locationHelpers.js - Location utility functions
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  const toRadians = (degrees) => {
    return degrees * (Math.PI / 180);
  };
  
  const isValidLocation = (location) => {
    return location && 
           typeof location.latitude === 'number' && 
           typeof location.longitude === 'number' &&
           !isNaN(location.latitude) && 
           !isNaN(location.longitude) &&
           location.latitude >= -90 && location.latitude <= 90 &&
           location.longitude >= -180 && location.longitude <= 180;
  };
  
  const validateLocationData = (req, res, next) => {
    const { location, deliveryLocation, salesPersonLocation } = req.body;
    
    // Check if any location field is present and validate it
    const locationFields = [
      { field: location, name: 'location' },
      { field: deliveryLocation, name: 'deliveryLocation' },
      { field: salesPersonLocation, name: 'salesPersonLocation' }
    ].filter(item => item.field);
  
    for (const { field, name } of locationFields) {
      if (!isValidLocation(field)) {
        return res.status(400).json({
          success: false,
          message: `Invalid ${name} coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.`
        });
      }
    }
  
    next();
  };
  
  // Find nearby locations
  const findNearbyLocations = (centerLat, centerLng, locations, radiusKm = 10) => {
    return locations.filter(location => {
      if (!isValidLocation(location)) return false;
      
      const distance = calculateDistance(
        centerLat, 
        centerLng, 
        location.latitude, 
        location.longitude
      );
      
      return distance <= radiusKm;
    }).map(location => ({
      ...location,
      distance: calculateDistance(centerLat, centerLng, location.latitude, location.longitude)
    })).sort((a, b) => a.distance - b.distance);
  };
  
  // Get location statistics for analytics
  const getLocationStats = async (model, userField = 'createdBy', userId, startDate, endDate) => {
    const matchQuery = {
      [userField]: userId,
      createdAt: { $gte: startDate, $lte: endDate }
    };
  
    const stats = await model.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          locationsWithCoords: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$salesPersonLocation.latitude', null] },
                    { $ne: ['$salesPersonLocation.longitude', null] }
                  ]
                },
                1,
                0
              ]
            }
          },
          avgLatitude: { $avg: '$salesPersonLocation.latitude' },
          avgLongitude: { $avg: '$salesPersonLocation.longitude' }
        }
      }
    ]);
  
    return stats[0] || {
      totalRecords: 0,
      locationsWithCoords: 0,
      avgLatitude: null,
      avgLongitude: null
    };
  };
  
  module.exports = {
    calculateDistance,
    toRadians,
    isValidLocation,
    validateLocationData,
    findNearbyLocations,
    getLocationStats
  };
