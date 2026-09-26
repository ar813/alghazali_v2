import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom hook for optimistic data loading with caching
 * @param {string} cacheKey - Unique key for AsyncStorage
 * @param {Function} fetchFunction - Async function to fetch data
 * @param {number} cacheExpiry - Cache expiry in milliseconds (default: 5 minutes)
 */
export const useOptimisticData = (cacheKey, fetchFunction, cacheExpiry = 5 * 60 * 1000) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadFromCache = async () => {
        try {
            const cachedData = await AsyncStorage.getItem(cacheKey);
            if (cachedData) {
                const { data: storedData, timestamp } = JSON.parse(cachedData);
                const isExpired = Date.now() - timestamp > cacheExpiry;

                if (!isExpired) {
                    setData(storedData);
                    setLoading(false);
                    return true; // Cache hit
                }
            }
            return false; // Cache miss or expired
        } catch (error) {
            console.error('Error loading from cache:', error);
            return false;
        }
    };

    const saveToCache = async (newData) => {
        try {
            const cacheItem = {
                data: newData,
                timestamp: Date.now(),
            };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    };

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);

        try {
            const freshData = await fetchFunction();
            setData(freshData);
            await saveToCache(freshData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const refetch = useCallback(() => {
        fetchData(true);
    }, [fetchFunction]);

    useEffect(() => {
        const init = async () => {
            const cacheHit = await loadFromCache();
            // Always fetch in background, even if cache hit
            fetchData(false);
        };
        init();
    }, [cacheKey]);

    return { data, loading, refreshing, refetch };
};
