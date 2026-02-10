"""
Conversation Agent – RAG-powered Q&A using the company's knowledge base.
"""

import logging
from app.utils.llm import cerebras_chat
from app.utils.embeddings import search_knowledge

logger = logging.getLogger(__name__)


def _build_system_prompt(ctx: dict) -> str:
    return f"""You are a helpful customer service agent for {ctx['companyName']}.

COMPANY INFORMATION:
- Services offered: {ctx['services']}
- Business hours: {ctx['businessHours']}
- Contact email: {ctx.get('contactEmail', 'N/A')}
- Contact phone: {ctx.get('contactPhone', 'N/A')}

YOUR ROLE:
- Answer customer questions accurately using the provided knowledge base context
- Be friendly, professional, and concise
- If you're unsure, acknowledge it and offer to connect them with a human
- Keep responses appropriate for phone conversation (spoken, not too long)

IMPORTANT:
- Only provide information that is in the knowledge base or company context
- Don't make up information that isn't provided
- If asked about something not in the knowledge base, say you'll need to check and offer alternatives"""


async def handle_information_query(
    query: str,
    company_id: str,
    company_context: dict,
    conversation_history: list[dict] | None = None,
) -> dict:
    """
    Answer an information query using RAG.

    Returns dict with keys: response, retrievedContext, errors
    """
    try:
        # 1. Retrieve relevant context from vector store
        retrieved: list[dict] = []
        try:
            retrieved = search_knowledge(query, company_id, top_k=5)
        except Exception as e:
            logger.warning("RAG retrieval failed, proceeding without context: %s", e)

        # 2. Build knowledge context
        if retrieved:
            context_text = "\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n" + "\n\n".join(
                f"[{i+1}] {doc['content']}" for i, doc in enumerate(retrieved)
            )
        else:
            context_text = "\n\n(No specific knowledge base content found for this query)"

        # 3. Build conversation history
        history_text = ""
        if conversation_history:
            recent = conversation_history[-6:]
            history_text = "\n\nCONVERSATION HISTORY:\n" + "\n".join(
                f"{'Customer' if m['role'] == 'user' else 'Agent'}: {m['content']}"
                for m in recent
            )

        # 4. Generate response
        system_prompt = _build_system_prompt(company_context)
        messages = [
            {"role": "system", "content": system_prompt + context_text},
            {
                "role": "user",
                "content": f'Customer query: "{query}"{history_text}\n\nRespond naturally as if speaking on the phone.',
            },
        ]

        resp = await cerebras_chat(messages, temperature=0.7, max_tokens=512)

        return {
            "response": resp.text,
            "retrievedContext": retrieved,
            "errors": [],
        }

    except Exception as exc:
        logger.exception("Conversation agent error")
        fallback = company_context.get(
            "fallbackMessage",
            "I apologize, but I'm having trouble accessing that information right now. "
            "Would you like me to have someone call you back?",
        )
        return {"response": fallback, "retrievedContext": [], "errors": [str(exc)]}
