// A factual handoff brief for authorized staff. This never fabricates a
// customer's intent or asks an external model to process a private chat.
const compact = (value, limit = 180) => String(value ?? '')
  .replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
const greeting = /^(?:hei|moi|moikka|terve|kiitos|kiitti|heippa|hello|hi|hey|thanks|thank you|bye|hej|hallå|tack)[!., ]*$/i;

export function handoffBrief(messages = []) {
  const recent = (Array.isArray(messages) ? messages : []).slice(-24);
  const customer = recent.map((item, index) => ({item, index}))
    .filter(({item}) => item?.role === 'user' && compact(item.message));
  const replies = recent.map((item, index) => ({item, index}))
    .filter(({item}) => ['bot', 'assistant', 'human'].includes(item?.role) && compact(item.message));
  const latestCustomer = customer.at(-1);
  const latestReply = replies.at(-1);
  const usefulCustomer = customer.filter(({item}) => !greeting.test(compact(item.message)));
  const needs = usefulCustomer.slice(-2).map(({item}) => compact(item.message));
  return {
    customerRequests: [...new Set(needs)],
    latestReply: latestReply ? compact(latestReply.item.message) : '',
    waitingForReply: Boolean(latestCustomer && (!latestReply || latestCustomer.index > latestReply.index)),
    messagesConsidered: recent.length,
    source: 'actual_chat_messages',
  };
}
