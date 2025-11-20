import region from './region.json'
import province from './province.json'
import city from './city.json'
import barangay from './barangay.json'
import zipCode from './zip-code.json'

// Regions
export const getRegions = () => region;

// Provinces inside a region
export const getProvinces = (regionCode) => {
    if (!regionCode) return [];
    return province.filter(p => String(p.region_code) === String(regionCode));
};

// Cities inside a province
export const getCities = (provinceCode) => {
    if (!provinceCode) return [];
    return city.filter(c => String(c.province_code) === String(provinceCode));
};

// Barangays inside a city
export const getBarangays = (cityCode) => {
    if (!cityCode) return [];
    return barangay.filter(b => String(b.city_code) === String(cityCode));
};

// ZIP code lookup (by barangay name)
export const getZipCode = (cityName) => {
    if (!cityName) return null;
    return zipCode.find(z => z.City == cityName) || null;
};
