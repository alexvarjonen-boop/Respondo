// Website content is untrusted. Never turn instructions to the assistant into
// business knowledge. This guard rejects only explicit model-directed payloads;
// ordinary website copy (including "do not" and "instructions") stays valid.
const injectionPatterns=[
  /\b(?:ignore|disregard|forget|bypass|override)\b.{0,65}\b(?:previous|prior|earlier|above|all)\b.{0,30}\b(?:instructions?|rules?|prompts?|safety)\b/i,
  /\b(?:unohda|ohita|sivuuta)\b.{0,50}\b(?:aiemmat|edelliset|kaikki)\b.{0,30}\b(?:ohjeet|saannot|säännöt|kehotteet)\b/i,
  /\b(?:ignorera|åsidosätt|asidosatt)\b.{0,45}\b(?:tidigare|alla)\b.{0,30}\b(?:instruktioner|regler)\b/i,
  /(?:<\|im_start\|>|<\|im_end\|>|<\|system\|>|<\|assistant\|>|<\|developer\|>|\[INST\]|\[\/INST\]|<<SYS>>|<\/?system>)/i,
  /(?:^|[\r\n])\s*(?:#{1,4}\s*)?(?:system|developer|assistant|user)\s*(?:prompt|message|instructions?)?\s*:/im,
  /\b(?:you are now|act as|pretend to be)\s+(?:the\s+)?(?:system|developer|chatgpt|ai assistant|administrator|admin)\b/i,
  /\b(?:print|reveal|expose|send|leak|disclose)\b.{0,80}\b(?:system prompt|hidden instructions|api keys?|secret keys?|access tokens?|passwords?)\b/i,
  /\b(?:disable|turn off|remove|ignore)\b.{0,50}\b(?:safety filters?|content filters?|security checks?|guardrails?)\b/i,
];
export function containsKnowledgeInstructionAttack(value){
  const text=String(value||'').slice(0,12000);
  if(!text)return false;
  return injectionPatterns.some(rx=>rx.test(text));
}
