"""
智能推荐 API 路由
包含上下文感知推荐、字段关联推理、历史数据智能填充等功能
"""
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel, Field

from app.core.context_aware_recommender import (
    analyze_form_context,
    get_recommender,
    ContextRecommendation,
)
from app.core.field_type_recommender import (
    generate_field_recommendations,
    get_field_type_recommender,
)


router = APIRouter(prefix="/api/recommend", tags=["recommend"])


class FieldInfo(BaseModel):
    """字段信息"""
    fieldName: str
    fieldLabel: Optional[str] = None
    inputType: Optional[str] = None


class ContextRecommendRequest(BaseModel):
    """上下文推荐请求"""
    filledFields: Dict[str, Any] = Field(..., description="已填写的字段值")
    fieldDefinitions: Optional[List[FieldInfo]] = Field(None, description="字段定义列表")
    targetFields: Optional[List[str]] = Field(None, description="要获取推荐的目标字段")
    excludeFields: Optional[List[str]] = Field(None, description="排除的字段")


class RecommendationItem(BaseModel):
    """推荐结果项"""
    targetField: str
    suggestedValue: Any
    confidence: float
    source: str
    explanation: str
    relatedFields: List[str]


class ContextRecommendResponse(BaseModel):
    """上下文推荐响应"""
    recommendations: List[RecommendationItem]
    totalCount: int


class AddressCompleteRequest(BaseModel):
    """地址补全请求"""
    partialAddress: str = Field(..., description="不完整的地址信息")
    province: Optional[str] = None
    city: Optional[str] = None
    limit: int = 5


class AddressSuggestion(BaseModel):
    """地址建议项"""
    fullAddress: str
    province: str
    city: Optional[str]
    district: Optional[str]
    confidence: float


class AddressCompleteResponse(BaseModel):
    """地址补全响应"""
    suggestions: List[AddressSuggestion]
    totalCount: int


class FieldTypeRecommendRequest(BaseModel):
    """字段类型推荐请求"""
    fieldDefinitions: List[FieldInfo] = Field(..., description="字段定义列表")
    filledFields: Optional[Dict[str, Any]] = Field(None, description="已填写的字段值")
    targetFields: Optional[List[str]] = Field(None, description="目标字段列表")
    excludeFields: Optional[List[str]] = Field(None, description="排除字段列表")


class FieldTypeRecommendationItem(BaseModel):
    """字段类型推荐结果项"""
    targetField: str
    suggestedValue: Any
    confidence: float
    source: str
    explanation: str
    exampleValues: List[str]
    relatedFields: List[str]
    fillHint: str


class FieldTypeRecommendResponse(BaseModel):
    """字段类型推荐响应"""
    recommendations: List[FieldTypeRecommendationItem]
    totalCount: int


class SemanticRuleItem(BaseModel):
    """语义规则项"""
    name: str
    matchKeywords: List[str]
    matchInputTypes: List[str]
    confidence: float
    explanation: str
    examples: List[str]
    fillHint: str


class SemanticRulesResponse(BaseModel):
    """语义规则列表响应"""
    rules: List[SemanticRuleItem]
    totalCount: int


@router.post("/context", response_model=ContextRecommendResponse)
async def get_context_recommendations(request: ContextRecommendRequest):
    """
    根据已填写字段上下文，智能推荐关联字段值

    支持的关联推理：
    - 身份证号 → 性别、出生日期、年龄、籍贯
    - 手机号 → 运营商归属
    - 姓名 → 性别推断
    - 省份 → 省会城市
    - 公司名称 → 行业
    - 地址 → 邮编
    - 邮箱 → 姓名/账号
    """
    try:
        logger.debug(f"收到上下文推荐请求，已填写字段: {list(request.filledFields.keys())}")

        field_defs = None
        if request.fieldDefinitions:
            field_defs = [f.model_dump() for f in request.fieldDefinitions]

        result = analyze_form_context(request.filledFields, field_defs)

        recommendations = []
        for target_field, rec_data in result.items():
            if request.targetFields and target_field not in request.targetFields:
                continue
            if request.excludeFields and target_field in request.excludeFields:
                continue

            recommendations.append(RecommendationItem(
                targetField=target_field,
                suggestedValue=rec_data['value'],
                confidence=rec_data['confidence'],
                source=rec_data['source'],
                explanation=rec_data['explanation'],
                relatedFields=rec_data.get('relatedFields', []),
            ))

        recommendations.sort(key=lambda r: r.confidence, reverse=True)

        logger.debug(f"生成 {len(recommendations)} 条上下文推荐")
        return ContextRecommendResponse(
            recommendations=recommendations,
            totalCount=len(recommendations),
        )

    except Exception as e:
        logger.exception(f"上下文推荐失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/address/complete", response_model=AddressCompleteResponse)
async def complete_address(request: AddressCompleteRequest):
    """
    地址智能补全

    根据不完整的地址信息，推荐可能的完整地址
    """
    try:
        partial = request.partialAddress.strip()
        if len(partial) < 2:
            return AddressCompleteResponse(suggestions=[], totalCount=0)

        logger.debug(f"地址补全请求: partial={partial}, province={request.province}, city={request.city}")

        address_db = [
            ('北京', '北京市', '东城区'),
            ('北京', '北京市', '西城区'),
            ('北京', '北京市', '朝阳区'),
            ('北京', '北京市', '海淀区'),
            ('上海', '上海市', '黄浦区'),
            ('上海', '上海市', '浦东新区'),
            ('上海', '上海市', '徐汇区'),
            ('广东', '广州市', '天河区'),
            ('广东', '广州市', '越秀区'),
            ('广东', '深圳市', '南山区'),
            ('广东', '深圳市', '福田区'),
            ('广东', '深圳市', '宝安区'),
            ('浙江', '杭州市', '西湖区'),
            ('浙江', '杭州市', '上城区'),
            ('浙江', '宁波市', '鄞州区'),
            ('江苏', '南京市', '鼓楼区'),
            ('江苏', '南京市', '玄武区'),
            ('江苏', '苏州市', '工业园区'),
            ('四川', '成都市', '锦江区'),
            ('四川', '成都市', '武侯区'),
            ('湖北', '武汉市', '武昌区'),
            ('湖北', '武汉市', '洪山区'),
            ('山东', '济南市', '历下区'),
            ('山东', '青岛市', '市南区'),
        ]

        suggestions = []
        for prov, city, district in address_db:
            if request.province and prov != request.province:
                continue
            if request.city and city != request.city:
                continue

            full = f'{prov}{city}{district}'
            confidence = 0.0

            if partial in full:
                confidence = 0.95 if partial == district else 0.85
            elif any(partial in part for part in [prov, city, district]):
                confidence = 0.75
            elif len(partial) >= 3 and (prov.startswith(partial[:2]) or city.startswith(partial[:2])):
                confidence = 0.5

            if confidence > 0:
                if partial in city:
                    confidence += 0.1
                if partial in district:
                    confidence += 0.15

                suggestions.append(AddressSuggestion(
                    fullAddress=full,
                    province=prov,
                    city=city,
                    district=district,
                    confidence=min(confidence, 0.99),
                ))

        suggestions.sort(key=lambda s: s.confidence, reverse=True)
        suggestions = suggestions[:request.limit]

        logger.debug(f"生成 {len(suggestions)} 条地址建议")
        return AddressCompleteResponse(
            suggestions=suggestions,
            totalCount=len(suggestions),
        )

    except Exception as e:
        logger.exception(f"地址补全失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/relation-rules")
async def get_relation_rules():
    """获取所有字段关联规则"""
    try:
        recommender = get_recommender()
        rules = []
        for rule in recommender._field_relation_rules:
            rules.append({
                'name': rule['name'],
                'sourceFields': rule['source_fields'],
                'targetFields': rule['target_fields'],
                'confidence': rule['confidence'],
            })
        return {'rules': rules, 'totalCount': len(rules)}
    except Exception as e:
        logger.exception(f"获取关联规则失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/field-type", response_model=FieldTypeRecommendResponse)
async def get_field_type_recommendations(request: FieldTypeRecommendRequest):
    """
    根据字段类型和语义智能生成填报建议和默认值

    支持的智能推荐：
    - 日期类型 → 默认今天、当前月、当前年
    - 时间类型 → 默认当前时间
    - 性别 → 根据姓名或身份证号推断
    - 年龄 → 根据出生日期自动计算
    - 邮箱 → 根据姓名自动生成
    - 邮编 → 根据地址推断
    - 国家 → 默认中国
    - 民族 → 默认汉族
    - 数量 → 默认1
    - 优先级 → 默认中
    - 状态 → 默认待审批
    - 各类格式示例 → 为用户提供填写参考
    """
    try:
        logger.debug(f"收到字段类型推荐请求，字段数量: {len(request.fieldDefinitions)}")

        field_defs = [f.model_dump() for f in request.fieldDefinitions]

        result = generate_field_recommendations(
            field_defs,
            request.filledFields,
            request.targetFields,
            request.excludeFields,
        )

        recommendations = []
        for rec in result:
            recommendations.append(FieldTypeRecommendationItem(
                targetField=rec['targetField'],
                suggestedValue=rec['suggestedValue'],
                confidence=rec['confidence'],
                source=rec['source'],
                explanation=rec['explanation'],
                exampleValues=rec['exampleValues'],
                relatedFields=rec['relatedFields'],
                fillHint=rec['fillHint'],
            ))

        logger.debug(f"生成 {len(recommendations)} 条字段类型推荐")
        return FieldTypeRecommendResponse(
            recommendations=recommendations,
            totalCount=len(recommendations),
        )

    except Exception as e:
        logger.exception(f"字段类型推荐失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/field-type/single")
async def get_single_field_type_recommendation(
    fieldName: str,
    fieldLabel: Optional[str] = None,
    inputType: Optional[str] = None,
    fieldType: Optional[str] = None,
):
    """
    为单个字段生成类型推荐
    """
    try:
        from app.core.field_type_recommender import SemanticFieldDef
        field_def = SemanticFieldDef(
            field_name=fieldName,
            field_label=fieldLabel,
            input_type=inputType,
            field_type=fieldType,
        )
        rec = get_field_type_recommender().recommend_for_field(field_def)
        if rec:
            return {
            'targetField': rec.target_field,
            'suggestedValue': rec.suggested_value,
            'confidence': rec.confidence,
            'source': rec.source,
            'explanation': rec.explanation,
            'exampleValues': rec.example_values,
            'relatedFields': rec.related_fields,
            'fillHint': rec.fill_hint,
        }
        return {"recommendation": None}
    except Exception as e:
        logger.exception(f"单字段类型推荐失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/semantic-rules", response_model=SemanticRulesResponse)
async def get_semantic_rules():
    """获取所有语义规则列表"""
    try:
        rules = get_field_type_recommender().get_all_semantic_rules()
        rule_items = [SemanticRuleItem(**rule) for rule in rules]
        return SemanticRulesResponse(
            rules=rule_items,
            totalCount=len(rule_items),
        )
    except Exception as e:
        logger.exception(f"获取语义规则失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))
