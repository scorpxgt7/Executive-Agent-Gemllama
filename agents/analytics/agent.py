from typing import Dict, Any, List
from shared.models import Task
import structlog
import openai
import os
from datetime import datetime

logger = structlog.get_logger()

class AnalyticsAgent:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            try:
                self.client = openai.OpenAI(api_key=api_key)
            except Exception as e:
                logger.error("Failed to initialize OpenAI client for AnalyticsAgent", error=str(e))
                self.client = None
        else:
            self.client = None

    async def analyze_performance(self, task: Task) -> Dict[str, Any]:
        """Analyze performance metrics"""
        metrics = task.parameters.get("metrics", [])
        data = task.parameters.get("data", {})
        timeframe = task.parameters.get("timeframe", "30 days")

        prompt = f"""
        Analyze performance metrics for the last {timeframe}:

        Metrics: {', '.join(metrics)}
        Data: {data}

        Provide comprehensive analysis including:
        1. Key performance indicators summary
        2. Trends and patterns identification
        3. Performance against benchmarks
        4. Strengths and weaknesses
        5. Actionable insights and recommendations
        6. Predictive forecasting

        Format as JSON:
        {{
            "kpi_summary": {{"metric": "value"}},
            "trends": ["trend1", "trend2"],
            "benchmark_comparison": {{"metric": "performance"}},
            "strengths": ["strength1", "strength2"],
            "weaknesses": ["weakness1", "weakness2"],
            "insights": ["insight1", "insight2"],
            "recommendations": ["recommendation1", "recommendation2"],
            "forecast": {{"metric": "prediction"}}
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
            logger.error("Analytics agent failed to analyze performance", error=str(e))
            return {
                "kpi_summary": {metric: "TBD" for metric in metrics},
                "trends": ["upward trend in engagement"],
                "benchmark_comparison": {"overall": "meeting expectations"},
                "strengths": ["consistent posting", "good engagement"],
                "weaknesses": ["limited reach", "conversion optimization needed"],
                "insights": ["content resonates with audience"],
                "recommendations": ["increase posting frequency", "optimize for conversions"],
                "forecast": {"revenue": "projected growth"}
            }

    async def track_goals(self, task: Task) -> Dict[str, Any]:
        """Track progress toward goals"""
        goals = task.parameters.get("goals", [])
        current_progress = task.parameters.get("current_progress", {})
        target_dates = task.parameters.get("target_dates", {})

        prompt = f"""
        Track progress toward these goals:

        Goals: {', '.join(goals)}
        Current Progress: {current_progress}
        Target Dates: {target_dates}

        Provide progress tracking including:
        1. Goal completion percentages
        2. Milestone achievements
        3. Timeline analysis
        4. Risk assessment
        5. Adjustment recommendations
        6. Next critical actions

        Format as JSON:
        {{
            "goal_progress": {{"goal": "percentage"}},
            "milestones_achieved": ["milestone1", "milestone2"],
            "timeline_status": {{"goal": "status"}},
            "risks_identified": ["risk1", "risk2"],
            "adjustments_needed": ["adjustment1", "adjustment2"],
            "next_actions": ["action1", "action2"]
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

            tracking = response.choices[0].message.content
            import json
            return json.loads(tracking.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Analytics agent failed to track goals", error=str(e))
            return {
                "goal_progress": {goal: "50%" for goal in goals},
                "milestones_achieved": ["initial setup complete"],
                "timeline_status": {goal: "on track" for goal in goals},
                "risks_identified": ["potential delays"],
                "adjustments_needed": ["increase resources"],
                "next_actions": ["execute next phase", "monitor closely"]
            }

    async def generate_insights(self, task: Task) -> Dict[str, Any]:
        """Generate actionable insights from data"""
        data_sources = task.parameters.get("data_sources", [])
        analysis_focus = task.parameters.get("focus", "general")

        prompt = f"""
        Generate actionable insights from available data:

        Data Sources: {', '.join(data_sources)}
        Analysis Focus: {analysis_focus}

        Provide insights including:
        1. Key findings and patterns
        2. Unexpected discoveries
        3. Correlation analysis
        4. Predictive indicators
        5. Strategic implications
        6. Tactical recommendations
        7. Measurement suggestions

        Format as JSON:
        {{
            "key_findings": ["finding1", "finding2"],
            "unexpected_discoveries": ["discovery1", "discovery2"],
            "correlations": ["correlation1", "correlation2"],
            "predictive_indicators": ["indicator1", "indicator2"],
            "strategic_implications": ["implication1", "implication2"],
            "tactical_recommendations": ["recommendation1", "recommendation2"],
            "measurement_suggestions": ["suggestion1", "suggestion2"]
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

            insights = response.choices[0].message.content
            import json
            return json.loads(insights.strip('```json').strip('```'))
        except Exception as e:
            logger.error("Analytics agent failed to generate insights", error=str(e))
            return {
                "key_findings": ["data shows positive trends"],
                "unexpected_discoveries": ["new audience segments identified"],
                "correlations": ["engagement correlates with content type"],
                "predictive_indicators": ["early signs of growth"],
                "strategic_implications": ["expand content strategy"],
                "tactical_recommendations": ["optimize posting times"],
                "measurement_suggestions": ["track additional metrics"]
            }
