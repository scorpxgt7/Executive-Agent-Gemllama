from typing import Dict, Any, List
from shared.models import Task
import structlog
import openai
import os
from datetime import datetime

logger = structlog.get_logger()

class MarketingAgent:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                self.client = openai.OpenAI(api_key=api_key)
            except Exception as e:
                logger.error("Failed to initialize OpenAI client for MarketingAgent", error=str(e))
                self.client = None
        else:
            self.client = None

    async def create_content(self, task: Task) -> Dict[str, Any]:
        """Create marketing content"""
        content_type = task.parameters.get("type", "article")
        topic = task.parameters.get("topic", "")
        target_audience = task.parameters.get("audience", "general")
        word_count = task.parameters.get("word_count", 800)

        prompt = f"""
        Create high-quality {content_type} content on: {topic}

        Target Audience: {target_audience}
        Word Count: {word_count}

        Content should be:
        - Engaging and valuable
        - SEO-optimized
        - Action-oriented
        - Shareable on social media
        - Include compelling headlines and hooks

        Format as JSON:
        {{
            "title": "Compelling headline",
            "content": "Full article content",
            "seo_keywords": ["keyword1", "keyword2"],
            "social_snippets": ["tweet1", "tweet2"],
            "call_to_action": "specific CTA",
            "estimated_engagement": "high|medium|low"
        }}
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2500
            )

            content_data = response.choices[0].message.content
            import json
            return json.loads(content_data.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Marketing agent failed to create content", error=str(e))
            return {
                "title": f"Complete Guide to {topic}",
                "content": f"This is a comprehensive guide about {topic}...",
                "seo_keywords": [topic.lower(), "guide", "tips"],
                "social_snippets": [f"Check out this guide on {topic}!", f"Learn about {topic} today"],
                "call_to_action": "Share this article with your network",
                "estimated_engagement": "medium"
            }

    async def create_promotion_strategy(self, task: Task) -> Dict[str, Any]:
        """Create content promotion strategy"""
        content_title = task.parameters.get("content_title", "")
        platforms = task.parameters.get("platforms", ["twitter", "linkedin"])
        target_audience = task.parameters.get("audience", "professionals")

        prompt = f"""
        Create a comprehensive promotion strategy for: {content_title}

        Target Platforms: {', '.join(platforms)}
        Target Audience: {target_audience}

        Strategy should include:
        1. Platform-specific messaging
        2. Posting schedule and timing
        3. Hashtag strategy
        4. Community engagement tactics
        5. Influencer outreach plan
        6. Cross-promotion opportunities
        7. Performance tracking metrics

        Format as JSON:
        {{
            "platform_strategy": {{"platform": "strategy"}},
            "posting_schedule": ["time1", "time2"],
            "hashtags": ["hashtag1", "hashtag2"],
            "engagement_tactics": ["tactic1", "tactic2"],
            "influencer_outreach": ["target1", "target2"],
            "cross_promotion": ["opportunity1", "opportunity2"],
            "tracking_metrics": ["metric1", "metric2"]
        }}
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
                max_tokens=1500
            )

            strategy = response.choices[0].message.content
            import json
            return json.loads(strategy.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Marketing agent failed to create promotion strategy", error=str(e))
            return {
                "platform_strategy": {platform: f"Optimized content for {platform}" for platform in platforms},
                "posting_schedule": ["9 AM", "2 PM", "6 PM"],
                "hashtags": ["#content", "#marketing", "#growth"],
                "engagement_tactics": ["respond to comments", "ask questions"],
                "influencer_outreach": ["industry experts", "thought leaders"],
                "cross_promotion": ["email newsletter", "other social platforms"],
                "tracking_metrics": ["engagement rate", "click-through rate"]
            }

    async def optimize_content(self, task: Task) -> Dict[str, Any]:
        """Optimize existing content for better performance"""
        content = task.parameters.get("content", "")
        current_performance = task.parameters.get("performance", {})
        optimization_goals = task.parameters.get("goals", ["engagement", "shares"])

        prompt = f"""
        Optimize this content for better performance:

        Original Content: {content[:500]}...

        Current Performance: {current_performance}
        Optimization Goals: {', '.join(optimization_goals)}

        Provide optimization recommendations:
        1. Content improvements
        2. Headline optimization
        3. Visual enhancements
        4. Call-to-action improvements
        5. Timing and distribution changes
        6. A/B testing suggestions

        Format as JSON:
        {{
            "content_improvements": ["improvement1", "improvement2"],
            "headline_suggestions": ["headline1", "headline2"],
            "visual_recommendations": ["visual1", "visual2"],
            "cta_optimization": ["cta1", "cta2"],
            "distribution_changes": ["change1", "change2"],
            "ab_tests": ["test1", "test2"]
        }}
        """

        try:
            if not self.client:
                raise ValueError("OpenAI client not initialized")
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=1500
            )

            optimization = response.choices[0].message.content
            import json
            return json.loads(optimization.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Marketing agent failed to optimize content", error=str(e))
            return {
                "content_improvements": ["add more examples", "include statistics"],
                "headline_suggestions": ["make more compelling", "add numbers"],
                "visual_recommendations": ["add relevant images", "use infographics"],
                "cta_optimization": ["make more specific", "create urgency"],
                "distribution_changes": ["post at different times", "use different platforms"],
                "ab_tests": ["test different headlines", "test different CTAs"]
            }
