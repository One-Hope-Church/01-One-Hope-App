const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your env.txt file');
    process.exit(1);
}

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Database operations
const db = {
    // Create or update user from Planning Center data
    async upsertUser(planningCenterData) {
        try {
            const { data: existingUser, error: selectError } = await supabase
                .from('users')
                .select('*')
                .eq('planning_center_id', planningCenterData.id)
                .single();

            if (selectError && selectError.code !== 'PGRST116') { // PGRST116 means no rows found
                console.error('❌ Error checking existing user:', selectError);
                throw selectError;
            }

            const userData = {
                planning_center_id: planningCenterData.id,
                planning_center_email: planningCenterData.email,
                name: planningCenterData.name,
                avatar_url: planningCenterData.avatar_url,
                last_login: new Date().toISOString()
            };

            let result;
            if (existingUser) {
                // Update existing user
                console.log('🔄 Updating existing user:', existingUser.id);
                result = await supabase
                    .from('users')
                    .update(userData)
                    .eq('id', existingUser.id)
                    .select()
                    .single();
            } else {
                // Create new user
                console.log('🆕 Creating new user for Planning Center ID:', planningCenterData.id);
                result = await supabase
                    .from('users')
                    .insert(userData)
                    .select()
                    .single();
            }

            if (result.error) {
                console.error('❌ Error upserting user:', result.error);
                throw result.error;
            }

            console.log('✅ User upserted successfully:', result.data.id);
            return result.data;

        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

    // Get user by Planning Center ID
    async getUserByPlanningCenterId(planningCenterId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('planning_center_id', planningCenterId)
                .single();

            if (error) {
                console.error('❌ Error fetching user:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('❌ Database error:', error);
            return null;
        }
    },

    // Get user by Supabase ID
    async getUserById(userId) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('❌ Error fetching user by ID:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('❌ Database error:', error);
            return null;
        }
    },

    // Simple streak tracking functions
    async getUserStreak(userId) {
        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('❌ Error fetching user streak:', error);
                return null;
            }

            return data || { current_streak: 0, total_readings: 0, last_reading_date: null };
        } catch (error) {
            console.error('❌ Database error:', error);
            return { current_streak: 0, total_readings: 0, last_reading_date: null };
        }
    },

    async updateUserStreak(userId, completedToday = false) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Get current progress
            const currentProgress = await this.getUserStreak(userId);
            
            let newStreak = 0;
            let totalReadings = currentProgress.total_readings || 0;
            let lastReadingDate = currentProgress.last_reading_date;

            if (completedToday) {
                // User completed today's reading
                if (currentProgress.last_reading_date === yesterday) {
                    // They read yesterday, increment streak
                    newStreak = (currentProgress.current_streak || 0) + 1;
                } else if (currentProgress.last_reading_date === today) {
                    // They already read today, keep current streak
                    newStreak = currentProgress.current_streak || 0;
                } else {
                    // They didn't read yesterday, reset streak to 1
                    newStreak = 1;
                }
                
                totalReadings = totalReadings + 1;
                lastReadingDate = today;
            } else {
                // User didn't complete today's reading
                if (currentProgress.last_reading_date === yesterday) {
                    // They read yesterday but not today, reset streak
                    newStreak = 0;
                } else {
                    // Keep current streak
                    newStreak = currentProgress.current_streak || 0;
                }
            }

            // Update or create progress record
            const progressData = {
                user_id: userId,
                current_streak: newStreak,
                total_readings: totalReadings,
                last_reading_date: lastReadingDate
            };

            let result;
            if (currentProgress && currentProgress.id) {
                // Update existing record
                result = await supabase
                    .from('user_progress')
                    .update(progressData)
                    .eq('id', currentProgress.id)
                    .select()
                    .single();
            } else {
                // Create new record
                result = await supabase
                    .from('user_progress')
                    .insert(progressData)
                    .select()
                    .single();
            }

            if (result.error) {
                console.error('❌ Error updating user streak:', result.error);
                throw result.error;
            }

            console.log('✅ User streak updated:', { userId, newStreak, totalReadings, lastReadingDate });
            return result.data;

        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    }
};

module.exports = { supabase, db }; 