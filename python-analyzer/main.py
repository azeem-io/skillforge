from fastapi import APIRouter, FastAPI

from analyzer.analyzer import SkillAnalyzer, compare_roles, plan
from analyzer.models import (
    AnalysisRequest,
    AnalysisResponse,
    ComparisonRequest,
    ComparisonResponse,
    Gap,
    PlanRequest,
    PlanResponse,
    Roadmap,
)

router = APIRouter()


app = FastAPI(
    title="SkillForge Analyzer",
    description="Skill gap analysis and roadmap generation.",
    version="0.1.0",
)


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/analyze", response_model=AnalysisResponse)
def analyze(request: AnalysisRequest) -> AnalysisResponse:
    return SkillAnalyzer(request).analyze()


@router.post("/gaps", response_model=list[Gap])
def gaps(request: AnalysisRequest) -> list[Gap]:
    return SkillAnalyzer(request).identify_gaps()


@router.post("/roadmap", response_model=Roadmap)
def roadmap(request: AnalysisRequest) -> Roadmap:
    analyzer = SkillAnalyzer(request)
    return analyzer.analyze().roadmap


@router.post("/plan", response_model=PlanResponse)
def plan_route(request: PlanRequest) -> PlanResponse:
    """skill-service's shape. /roadmap keeps ai-service's."""
    return plan(request)


@router.post("/compare", response_model=ComparisonResponse)
def compare(request: ComparisonRequest) -> ComparisonResponse:
    return compare_roles(request)


@router.post("/score")
def score(request: AnalysisRequest) -> dict[str, int]:
    return {"readiness_score": SkillAnalyzer(request).calculate_score()}


# Bare paths for ai-service and skill-service, /api/analysis for the gateway,
# which forwards the request path unchanged.
app.include_router(router)
app.include_router(router, prefix="/api/analysis")
