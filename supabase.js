const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

// Helper function to get Chicago timezone date
function getChicagoDate() {
    const now = new Date();
    // Chicago is UTC-6 (CST) or UTC-5 (CDT)
    const chicagoTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Chicago"}));
    return chicagoTime.toISOString().split('T')[0];
}

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
            console.log('🔍 Upserting user data with avatar_url:', planningCenterData.avatar_url);

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

    // Create or update user ensuring the row id aligns with Supabase Auth user id
    async upsertUserWithAuthId(authUserId, planningCenterData) {
        try {
            // Try by id first
            let existingUser = null;
            {
                const { data, error } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', authUserId)
                    .single();
                if (!error) existingUser = data;
            }

            // Check if Planning Center ID is already linked to a different user
            if (planningCenterData?.id) {
                const { data: pcUser, error: pcError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('planning_center_id', planningCenterData.id)
                    .single();
                
                if (!pcError && pcUser && pcUser.id !== authUserId) {
                    console.log('⚠️ Planning Center ID already linked to different user:', pcUser.id);
                    throw new Error(`Planning Center account is already linked to another user (${pcUser.email || pcUser.name})`);
                }
            }

            console.log('🔧 Database function received planningCenterData:', planningCenterData);
            const userData = {
                id: authUserId,
                planning_center_id: planningCenterData?.id || null,
                planning_center_email: planningCenterData?.email || null,
                name: planningCenterData?.name || null,
                phone: planningCenterData?.phone || null,
                avatar_url: planningCenterData?.avatar_url || null,
                last_login: new Date().toISOString()
            };
            console.log('🔧 Database function created userData:', userData);

            let result;
            if (existingUser) {
                result = await supabase
                    .from('users')
                    .update(userData)
                    .eq('id', existingUser.id)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from('users')
                    .insert(userData)
                    .select()
                    .single();
            }

            if (result.error) {
                console.error('❌ Error upserting user with auth id:', result.error);
                throw result.error;
            }

            return result.data;
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

    async updateUserLastLogin(userId) {
        const { data, error } = await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();
        if (error) {
            console.error('❌ Error updating last_login:', error);
            return null;
        }
        return data;
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

            console.log('🔍 Retrieved user from database with avatar_url:', data.avatar_url);
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

    async authUserExists(email) {
        if (!email) {
            return false;
        }
        try {
            const normalizedEmail = String(email).trim().toLowerCase();
            const response = await axios.get(`${supabaseUrl}/auth/v1/admin/users`, {
                headers: {
                    apikey: supabaseServiceKey,
                    Authorization: `Bearer ${supabaseServiceKey}`
                },
                params: {
                    email: normalizedEmail
                }
            });

            const users = response.data?.users || [];
            const found = users.some((user) => String(user.email || '').toLowerCase() === normalizedEmail);
            return found;
        } catch (error) {
            console.error('❌ authUserExists error:', error);
            throw error;
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

    async getDailyReadingStatus(userId, date) {
        try {
            const { data, error } = await supabase
                .from('reading_history')
                .select('*')
                .eq('user_id', userId)
                .eq('reading_date', date)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('❌ Error fetching daily reading status:', error);
                return null;
            }

            return data || { completed: false, sections_completed: {} };
        } catch (error) {
            console.error('❌ Database error:', error);
            return { completed: false, sections_completed: {} };
        }
    },

    async updateDailyReadingStatus(userId, date, sectionsCompleted) {
        try {
            const allCompleted = Object.values(sectionsCompleted).every(completed => completed);
            
            const readingData = {
                user_id: userId,
                reading_date: date,
                completed: allCompleted,
                sections_completed: sectionsCompleted
            };

            // Check if record exists
            const existingRecord = await this.getDailyReadingStatus(userId, date);
            
            let result;
            if (existingRecord && existingRecord.id) {
                // Update existing record
                result = await supabase
                    .from('reading_history')
                    .update(readingData)
                    .eq('id', existingRecord.id)
                    .select()
                    .single();
            } else {
                // Create new record
                result = await supabase
                    .from('reading_history')
                    .insert(readingData)
                    .select()
                    .single();
            }

            if (result.error) {
                console.error('❌ Error updating daily reading status:', result.error);
                throw result.error;
            }

            console.log('✅ Daily reading status updated:', { userId, date, sectionsCompleted, allCompleted });
            return result.data;

        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

    async updateUserStreak(userId, completedToday = false) {
        try {
            const today = getChicagoDate();
            // Get yesterday in Chicago timezone
            const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
            const yesterdayChicago = new Date(yesterday.toLocaleString("en-US", {timeZone: "America/Chicago"}));
            const yesterdayDate = yesterdayChicago.toISOString().split('T')[0];

            // Get current progress
            const currentProgress = await this.getUserStreak(userId);
            
            let newStreak = 0;
            let totalReadings = currentProgress.total_readings || 0;
            let lastReadingDate = currentProgress.last_reading_date;

            if (completedToday) {
                // User completed today's reading
                if (currentProgress.last_reading_date === yesterdayDate) {
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
                // Check if last reading was more than 1 day ago
                if (!lastReadingDate) {
                    // Never read before, streak is 0
                    newStreak = 0;
                } else {
                    // Parse dates properly (they're in YYYY-MM-DD format)
                    const lastReading = new Date(lastReadingDate + 'T00:00:00');
                    const todayDate = new Date(today + 'T00:00:00');
                    
                    // Calculate days difference (handles timezone correctly)
                    const daysSinceLastReading = Math.floor((todayDate - lastReading) / (1000 * 60 * 60 * 24));
                    
                    if (daysSinceLastReading > 1) {
                        // More than 1 day since last reading (2+ days ago), reset streak to 0
                        newStreak = 0;
                    } else if (lastReadingDate === yesterdayDate) {
                        // They read yesterday but not today - streak is still active, keep it
                        newStreak = currentProgress.current_streak || 0;
                    } else if (lastReadingDate === today) {
                        // They read today but haven't completed it yet, keep current streak
                        newStreak = currentProgress.current_streak || 0;
                    } else {
                        // Last reading was less than 1 day ago, keep current streak
                        newStreak = currentProgress.current_streak || 0;
                    }
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
    },

    // User Steps Functions
    async getUserSteps(userId) {
        try {
            const { data, error } = await supabase
                .from('user_steps')
                .select('*')
                .eq('user_id', userId);

            if (error) {
                console.error('❌ Error fetching user steps:', error);
                throw error;
            }

            console.log('✅ User steps fetched:', data);
            return data || [];
        } catch (error) {
            console.error('❌ Database error:', error);
            return [];
        }
    },

    async upsertUserStep(userId, stepId, completed = false, notes = null) {
        try {
            const stepData = {
                user_id: userId,
                step_id: stepId,
                completed: completed,
                completed_date: completed ? new Date().toISOString() : null,
                notes: notes
            };

            const { data, error } = await supabase
                .from('user_steps')
                .upsert(stepData, { 
                    onConflict: 'user_id,step_id',
                    ignoreDuplicates: false 
                })
                .select()
                .single();

            if (error) {
                console.error('❌ Error upserting user step:', error);
                throw error;
            }

            console.log('✅ User step upserted:', { userId, stepId, completed });
            return data;
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

        async bulkUpsertUserSteps(userId, stepsData) {
        try {
            const stepsToUpsert = stepsData.map(step => ({
                user_id: userId,
                step_id: step.stepId,
                completed: step.completed,
                completed_date: step.completed ? new Date().toISOString() : null,
                notes: step.notes || null
            }));

            const { data, error } = await supabase
                .from('user_steps')
                .upsert(stepsToUpsert, {
                    onConflict: 'user_id,step_id',
                    ignoreDuplicates: false
                })
                .select();

            if (error) {
                console.error('❌ Error bulk upserting user steps:', error);
                throw error;
            }

            console.log('✅ User steps bulk upserted:', { userId, stepsCount: stepsToUpsert.length });
            return data;
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

    async clearUserSteps(userId) {
        try {
            const { error } = await supabase
                .from('user_steps')
                .delete()
                .eq('user_id', userId);

            if (error) {
                console.error('❌ Error clearing user steps:', error);
                throw error;
            }

            console.log('✅ User steps cleared for user:', userId);
            return true;
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    }
    ,

    // Replace all Planning Center group memberships for a user
    async replaceGroupMemberships(userId, memberships) {
        try {
            // Delete existing
            const { error: delErr } = await supabase
                .from('pc_group_memberships')
                .delete()
                .eq('user_id', userId);
            if (delErr) {
                console.error('❌ Error clearing group memberships:', delErr);
                throw delErr;
            }

            if (!memberships || memberships.length === 0) return [];

            const rows = memberships.map(m => ({
                user_id: userId,
                pc_group_id: m.pc_group_id,
                pc_group_name: m.pc_group_name || null,
                role: m.role || null,
                updated_at: new Date().toISOString()
            }));

            const { data, error } = await supabase
                .from('pc_group_memberships')
                .upsert(rows, { onConflict: 'user_id,pc_group_id', ignoreDuplicates: false })
                .select();
            if (error) {
                console.error('❌ Error upserting group memberships:', error);
                throw error;
            }
            return data;
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

    // Replace all Planning Center event registrations for a user
    async replaceEventRegistrations(userId, registrations) {
        try {
            const { error: delErr } = await supabase
                .from('pc_event_registrations')
                .delete()
                .eq('user_id', userId);
            if (delErr) {
                console.error('❌ Error clearing event registrations:', delErr);
                throw delErr;
            }

            if (!registrations || registrations.length === 0) return [];

            const rows = registrations.map(r => ({
                user_id: userId,
                pc_event_id: r.pc_event_id,
                pc_event_name: r.pc_event_name || null,
                pc_event_time_id: r.pc_event_time_id || null,
                status: r.status || null,
                starts_at: r.starts_at || null,
                ends_at: r.ends_at || null,
                registration_url: r.registration_url || null,
                updated_at: new Date().toISOString()
            }));

            const { data, error } = await supabase
                .from('pc_event_registrations')
                .upsert(rows, { onConflict: 'user_id,pc_event_id', ignoreDuplicates: false })
                .select();
            if (error) {
                console.error('❌ Error upserting event registrations:', error);
                throw error;
            }
            return data;
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

    // Admin reporting helpers
    async listAllUsersBasic() {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, planning_center_email, name, phone, created_at, last_login, is_admin')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Error fetching users for reporting:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

    async listAllUserSteps() {
        try {
            const { data, error } = await supabase
                .from('user_steps')
                .select('user_id, step_id, completed, completed_date, notes, updated_at')
                .order('user_id', { ascending: true });

            if (error) {
                console.error('❌ Error fetching user steps for reporting:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    },

    async listAllUserProgress() {
        try {
            const { data, error } = await supabase
                .from('user_progress')
                .select('user_id, current_streak, total_readings, last_reading_date, updated_at')
                .order('current_streak', { ascending: false });

            if (error) {
                console.error('❌ Error fetching user progress for reporting:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('❌ Database error:', error);
            throw error;
        }
    }
};

module.exports = { supabase, db }; 