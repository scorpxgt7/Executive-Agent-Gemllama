from typing import Dict, Any, List
from shared.models import Task
import structlog
import openai
import os
from datetime import datetime

logger = structlog.get_logger()

class ResearchAgent:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                self.client = openai.OpenAI(api_key=api_key)
            except Exception as e:
                logger.error("Failed to initialize OpenAI client for ResearchAgent", error=str(e))
                self.client = None
        else:
            self.client = None

    async def conduct_research(self, task: Task) -> Dict[str, Any]:
        """Conduct research based on task parameters"""
        research_focus = task.parameters.get("focus", "")
        research_type = task.parameters.get("type", "general")

        prompt = f"""
        Conduct comprehensive research on: {research_focus}

        Research Type: {research_type}

        Provide detailed findings including:
        1. Current market landscape
        2. Key opportunities and trends
        3. Competitive analysis
        4. Success factors and best practices
        5. Potential challenges and risks
        6. Actionable recommendations

        Format as structured JSON:
        {{
            "market_overview": "overview text",
            "opportunities": ["opportunity1", "opportunity2"],
            "trends": ["trend1", "trend2"],
            "competition": ["competitor1", "competitor2"],
            "success_factors": ["factor1", "factor2"],
            "challenges": ["challenge1", "challenge2"],
            "recommendations": ["recommendation1", "recommendation2"],
            "data_sources": ["source1", "source2"]
        }}
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=2000
            )

            research_results = response.choices[0].message.content
            import json
            return json.loads(research_results.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Research agent failed to conduct research", error=str(e))
            return {
                "market_overview": f"Research on {research_focus} completed with limitations",
                "opportunities": ["content creation", "affiliate marketing", "freelancing"],
                "trends": ["digital content consumption", "remote work"],
                "competition": ["established content creators", "marketing agencies"],
                "success_factors": ["consistent publishing", "audience engagement"],
                "challenges": ["content saturation", "algorithm changes"],
                "recommendations": ["focus on niche topics", "build email list"],
                "data_sources": ["industry reports", "competitor analysis"]
            }

    async def analyze_competition(self, task: Task) -> Dict[str, Any]:
        """Analyze competitive landscape"""
        target_market = task.parameters.get("market", "")
        competitors = task.parameters.get("competitors", [])

        prompt = f"""
        Analyze the competitive landscape for: {target_market}

        Known competitors: {', '.join(competitors)}

        Provide competitive analysis including:
        1. Market positioning of key players
        2. Competitive advantages and disadvantages
        3. Market gaps and opportunities
        4. Pricing and monetization strategies
        5. Marketing and distribution channels
        6. SWOT analysis for each major competitor

        Format as JSON:
        {{
            "market_positioning": {{"competitor": "position"}},
            "competitive_advantages": ["advantage1", "advantage2"],
            "market_gaps": ["gap1", "gap2"],
            "pricing_strategies": ["strategy1", "strategy2"],
            "marketing_channels": ["channel1", "channel2"],
            "swot_analysis": {{"competitor": {{"strengths": [], "weaknesses": [], "opportunities": [], "threats": []}}}}
        }}
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
                max_tokens=1500
            )

            analysis = response.choices[0].message.content
            import json
            return json.loads(analysis.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Research agent failed to analyze competition", error=str(e))
            return {
                "market_positioning": {"major_players": "established"},
                "competitive_advantages": ["brand recognition", "large audiences"],
                "market_gaps": ["niche specialization", "personal touch"],
                "pricing_strategies": ["freemium", "subscription"],
                "marketing_channels": ["social media", "content marketing"],
                "swot_analysis": {}
            }

    async def gather_market_data(self, task: Task) -> Dict[str, Any]:
        """Gather market data and statistics"""
        market_segment = task.parameters.get("segment", "")
        metrics = task.parameters.get("metrics", [])

        prompt = f"""
        Gather market data for: {market_segment}

        Required metrics: {', '.join(metrics)}

        Provide comprehensive market data including:
        1. Market size and growth projections
        2. Key performance indicators
        3. Demographic analysis
        4. Geographic distribution
        5. Consumer behavior patterns
        6. Technology adoption rates

        Format as JSON:
        {{
            "market_size": "size estimate",
            "growth_rate": "annual growth %",
            "key_metrics": {{"metric": "value"}},
            "demographics": {{"segment": "percentage"}},
            "geographic_distribution": {{"region": "percentage"}},
            "consumer_behavior": ["behavior1", "behavior2"],
            "technology_adoption": "adoption rate"
        }}
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1500
            )

            data = response.choices[0].message.content
            import json
            return json.loads(data.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Research agent failed to gather market data", error=str(e))
            return {
                "market_size": "TBD",
                "growth_rate": "5-10%",
                "key_metrics": {},
                "demographics": {},
                "geographic_distribution": {},
                "consumer_behavior": ["research-driven", "value-conscious"],
                "technology_adoption": "moderate"
            }
