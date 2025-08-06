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

            if (selectError && selectError.code !== 'PGRST116') {
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
    }
};

module.exports = { supabase, db }; 