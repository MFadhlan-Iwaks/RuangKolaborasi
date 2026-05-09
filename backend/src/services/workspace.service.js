const { supabaseAdmin } = require('../config/supabase');

async function getChannelForMember(channelId, userId) {
  const { data: channel, error } = await supabaseAdmin
    .from('channels')
    .select('id, workspace_id, name')
    .eq('id', channelId)
    .maybeSingle();

  if (error) {
    error.status = 500;
    throw error;
  }

  if (!channel) {
    const notFound = new Error('Channel not found');
    notFound.status = 404;
    throw notFound;
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', channel.workspace_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberError) {
    memberError.status = 500;
    throw memberError;
  }

  if (!member) {
    const forbidden = new Error('You are not a member of this workspace');
    forbidden.status = 403;
    throw forbidden;
  }

  return channel;
}

module.exports = {
  getChannelForMember
};
