"""
上下文感知智能推荐模块
消费表单中已填写字段的上下文信息，智能推断和推荐其他字段的可能值
实现字段间关联推理：身份证→性别/年龄、手机号→归属地、公司→行业、地址→省市区补全等
"""
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from loguru import logger


@dataclass
class ContextRecommendation:
    """上下文推荐结果"""
    target_field: str
    suggested_value: Any
    confidence: float
    source: str
    explanation: str
    related_fields: List[str] = field(default_factory=list)


@dataclass
class FieldContext:
    """字段上下文信息"""
    field_name: str
    value: Any
    field_type: Optional[str] = None
    field_label: Optional[str] = None


class ContextAwareRecommender:
    """上下文感知推荐器
    分析已填写字段，推导关联字段的推荐值
    """

    def __init__(self):
        self._field_relation_rules = self._init_relation_rules()
        self._address_database = self._init_address_database()

    def _init_relation_rules(self) -> List[Dict[str, Any]]:
        """初始化字段关联规则库"""
        return [
            {
                'name': 'id_card_to_gender',
                'source_fields': ['idCard', 'id_card', '身份证号', '身份证'],
                'target_fields': ['gender', '性别', 'sex'],
                'handler': self._infer_gender_from_id_card,
                'confidence': 0.98,
            },
            {
                'name': 'id_card_to_birthday',
                'source_fields': ['idCard', 'id_card', '身份证号', '身份证'],
                'target_fields': ['birthday', '出生日期', 'birthDate', 'birth_date', '出生年月'],
                'handler': self._infer_birthday_from_id_card,
                'confidence': 0.99,
            },
            {
                'name': 'id_card_to_age',
                'source_fields': ['idCard', 'id_card', '身份证号', '身份证'],
                'target_fields': ['age', '年龄'],
                'handler': self._infer_age_from_id_card,
                'confidence': 0.95,
            },
            {
                'name': 'id_card_to_region',
                'source_fields': ['idCard', 'id_card', '身份证号', '身份证'],
                'target_fields': ['hometown', '籍贯', 'nativePlace', '出生地', '户籍所在地'],
                'handler': self._infer_region_from_id_card,
                'confidence': 0.90,
            },
            {
                'name': 'phone_to_location',
                'source_fields': ['phone', 'mobile', '手机号', '手机号码', '电话'],
                'target_fields': ['phoneLocation', '手机号归属地', '手机所在地', 'city', '城市'],
                'handler': self._infer_phone_location,
                'confidence': 0.85,
            },
            {
                'name': 'name_to_gender',
                'source_fields': ['name', '姓名', 'realName', '真实姓名'],
                'target_fields': ['gender', '性别', 'sex'],
                'handler': self._infer_gender_from_name,
                'confidence': 0.75,
            },
            {
                'name': 'province_to_city',
                'source_fields': ['province', '省份', '省'],
                'target_fields': ['city', '城市', '市'],
                'handler': self._infer_city_from_province,
                'confidence': 0.60,
            },
            {
                'name': 'address_to_zipcode',
                'source_fields': ['address', '详细地址', '住址', '地址'],
                'target_fields': ['postalCode', 'zipcode', '邮政编码', '邮编'],
                'handler': self._infer_zipcode_from_address,
                'confidence': 0.70,
            },
            {
                'name': 'company_to_industry',
                'source_fields': ['company', '公司', '单位', 'companyName', '公司名称', '工作单位'],
                'target_fields': ['industry', '行业', 'industryType', '所属行业'],
                'handler': self._infer_industry_from_company,
                'confidence': 0.70,
            },
            {
                'name': 'email_to_name',
                'source_fields': ['email', '邮箱', '电子邮箱'],
                'target_fields': ['name', '姓名', 'account', '账号'],
                'handler': self._infer_name_from_email,
                'confidence': 0.55,
            },
        ]

    def _init_address_database(self) -> Dict[str, Dict[str, Any]]:
        """初始化简易地址数据库（省-市-邮编映射）"""
        return {
            '北京': {
                'cities': ['北京市'],
                'capital': '北京市',
                'zipcode_prefix': '100',
            },
            '上海': {
                'cities': ['上海市'],
                'capital': '上海市',
                'zipcode_prefix': '200',
            },
            '广东': {
                'cities': ['广州市', '深圳市', '东莞市', '佛山市', '珠海市', '中山市'],
                'capital': '广州市',
                'zipcode_prefix': '510',
            },
            '浙江': {
                'cities': ['杭州市', '宁波市', '温州市', '绍兴市', '金华市'],
                'capital': '杭州市',
                'zipcode_prefix': '310',
            },
            '江苏': {
                'cities': ['南京市', '苏州市', '无锡市', '常州市', '南通市'],
                'capital': '南京市',
                'zipcode_prefix': '210',
            },
            '山东': {
                'cities': ['济南市', '青岛市', '烟台市', '潍坊市', '临沂市'],
                'capital': '济南市',
                'zipcode_prefix': '250',
            },
            '四川': {
                'cities': ['成都市', '绵阳市', '德阳市', '宜宾市', '泸州市'],
                'capital': '成都市',
                'zipcode_prefix': '610',
            },
            '湖北': {
                'cities': ['武汉市', '宜昌市', '襄阳市', '荆州市', '黄石市'],
                'capital': '武汉市',
                'zipcode_prefix': '430',
            },
            '河南': {
                'cities': ['郑州市', '洛阳市', '开封市', '新乡市', '许昌市'],
                'capital': '郑州市',
                'zipcode_prefix': '450',
            },
        }

    # ===================== 推理规则实现 =====================

    def _infer_gender_from_id_card(self, id_card: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """从身份证号推断性别"""
        if not id_card or len(id_card) < 17:
            return None
        try:
            gender_digit = int(id_card[16])
            gender = '男' if gender_digit % 2 == 1 else '女'
            return ContextRecommendation(
                target_field='gender',
                suggested_value=gender,
                confidence=0.98,
                source='ID_CARD_PARSE',
                explanation=f'根据身份证号第17位({gender_digit})推断，奇数为男，偶数为女',
                related_fields=['idCard'],
            )
        except (ValueError, IndexError):
            return None

    def _infer_birthday_from_id_card(self, id_card: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """从身份证号推断出生日期"""
        if not id_card or len(id_card) < 14:
            return None
        try:
            year = id_card[6:10]
            month = id_card[10:12]
            day = id_card[12:14]
            birthday = f'{year}-{month}-{day}'
            if 1900 <= int(year) <= 2100 and 1 <= int(month) <= 12 and 1 <= int(day) <= 31:
                return ContextRecommendation(
                    target_field='birthday',
                    suggested_value=birthday,
                    confidence=0.99,
                    source='ID_CARD_PARSE',
                    explanation=f'从身份证号第7-14位解析出生日期',
                    related_fields=['idCard'],
                )
        except (ValueError, IndexError):
            pass
        return None

    def _infer_age_from_id_card(self, id_card: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """从身份证号推断年龄"""
        import datetime
        if not id_card or len(id_card) < 14:
            return None
        try:
            year = int(id_card[6:10])
            current_year = datetime.datetime.now().year
            age = current_year - year
            if 0 <= age <= 150:
                return ContextRecommendation(
                    target_field='age',
                    suggested_value=age,
                    confidence=0.95,
                    source='ID_CARD_PARSE',
                    explanation=f'根据出生年份{year}计算，当前约{age}岁',
                    related_fields=['idCard'],
                )
        except (ValueError, IndexError):
            pass
        return None

    def _infer_region_from_id_card(self, id_card: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """从身份证号前6位推断籍贯地区"""
        region_codes = {
            '110000': '北京市', '110100': '北京市', '110101': '北京市东城区',
            '310000': '上海市', '310100': '上海市',
            '440000': '广东省', '440100': '广东省广州市', '440300': '广东省深圳市',
            '330000': '浙江省', '330100': '浙江省杭州市',
            '320000': '江苏省', '320100': '江苏省南京市',
            '510000': '四川省', '510100': '四川省成都市',
        }
        if not id_card or len(id_card) < 6:
            return None
        prefix = id_card[:6]
        region = region_codes.get(prefix) or region_codes.get(prefix[:4] + '00') or region_codes.get(prefix[:2] + '0000')
        if region:
            return ContextRecommendation(
                target_field='hometown',
                suggested_value=region,
                confidence=0.90,
                source='ID_CARD_REGION',
                explanation=f'根据身份证号前6位地区码({prefix})推断',
                related_fields=['idCard'],
            )
        return None

    def _infer_phone_location(self, phone: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """从手机号推断归属地（简化版）"""
        phone_prefix = {
            '130': '中国联通', '131': '中国联通', '132': '中国联通',
            '133': '中国电信', '134': '中国移动', '135': '中国移动',
            '136': '中国移动', '137': '中国移动', '138': '中国移动',
            '139': '中国移动',
            '150': '中国移动', '151': '中国移动', '152': '中国移动',
            '153': '中国电信', '155': '中国联通', '156': '中国联通',
            '157': '中国移动', '158': '中国移动', '159': '中国移动',
            '180': '中国电信', '181': '中国电信', '182': '中国移动',
            '183': '中国移动', '184': '中国移动', '185': '中国联通',
            '186': '中国联通', '187': '中国移动', '188': '中国移动',
            '189': '中国电信',
            '170': '虚拟运营商', '171': '虚拟运营商',
            '173': '中国电信', '175': '中国联通', '176': '中国联通',
            '177': '中国电信', '178': '中国移动',
        }
        if not phone or len(phone) < 3:
            return None
        digits = ''.join(c for c in phone if c.isdigit())
        if len(digits) >= 3:
            prefix = digits[:3]
            carrier = phone_prefix.get(prefix)
            if carrier:
                return ContextRecommendation(
                    target_field='phoneLocation',
                    suggested_value=carrier,
                    confidence=0.85,
                    source='PHONE_PREFIX',
                    explanation=f'根据手机号段{prefix}推断运营商',
                    related_fields=['phone'],
                )
        return None

    def _infer_gender_from_name(self, name: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """根据姓名用字推断性别"""
        if not name or len(name) < 2:
            return None

        female_chars = set('秀兰娟英华慧敏丽娜芳艳丹洁红婷敏霞燕玲桂娣瑞荣琴妹晶华雪爱梅琳素云莲真雪环')
        male_chars = set('伟强磊军勇杰涛峰华明刚平辉鹏腾飞林波斌宇浩凯健俊帅威晨阳博')

        last_char = name[-1] if len(name) > 1 else name[0]
        female_score = sum(1 for c in name if c in female_chars)
        male_score = sum(1 for c in name if c in male_chars)

        if last_char in female_chars or female_score > male_score:
            return ContextRecommendation(
                target_field='gender',
                suggested_value='女',
                confidence=0.65,
                source='NAME_PATTERN',
                explanation=f'根据姓名用字"{name}"推断（女性用字较多）',
                related_fields=['name'],
            )
        elif last_char in male_chars or male_score > female_score:
            return ContextRecommendation(
                target_field='gender',
                suggested_value='男',
                confidence=0.65,
                source='NAME_PATTERN',
                explanation=f'根据姓名用字"{name}"推断（男性用字较多）',
                related_fields=['name'],
            )
        return None

    def _infer_city_from_province(self, province: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """根据省份推荐省会城市"""
        if not province:
            return None

        for prov_name, info in self._address_database.items():
            if prov_name in province or province in prov_name:
                return ContextRecommendation(
                    target_field='city',
                    suggested_value=info['capital'],
                    confidence=0.60,
                    source='PROVINCE_CAPITAL',
                    explanation=f'{prov_name}省会为{info["capital"]}，如非省会可手动选择',
                    related_fields=['province'],
                )
        return None

    def _infer_zipcode_from_address(self, address: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """根据地址推断邮编前缀"""
        if not address:
            return None

        for prov_name, info in self._address_database.items():
            if prov_name in address:
                suggested = info['zipcode_prefix'] + '000'
                return ContextRecommendation(
                    target_field='postalCode',
                    suggested_value=suggested,
                    confidence=0.70,
                    source='ADDRESS_ZIPCODE',
                    explanation=f'{prov_name}邮编前缀为{info["zipcode_prefix"]}，{suggested}为通用邮编',
                    related_fields=['address'],
                )
        return None

    def _infer_industry_from_company(self, company: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """根据公司名称推断行业"""
        if not company:
            return None

        industry_patterns = [
            ('互联网', ['科技', '网络', '互联网', '信息', '软件', '数码', '数据']),
            ('金融', ['银行', '证券', '基金', '保险', '投资', '财富', '金融', '支付']),
            ('教育', ['教育', '培训', '学校', '学院', '大学', '中学', '幼儿园']),
            ('医疗健康', ['医院', '医药', '医疗', '健康', '生物', '药业', '诊所']),
            ('制造业', ['制造', '工业', '电子', '机械', '化工', '纺织', '建材']),
            ('房地产', ['地产', '房产', '置业', '物业', '建筑', '建设', '工程']),
            ('贸易零售', ['贸易', '商贸', '零售', '百货', '超市', '电商', '商城']),
            ('文化传媒', ['文化', '传媒', '广告', '影视', '娱乐', '传播', '出版']),
            ('物流运输', ['物流', '运输', '快递', '货运', '仓储', '配送']),
            ('餐饮服务', ['餐饮', '酒店', '饭店', '宾馆', '旅游', '会议']),
        ]

        for industry, keywords in industry_patterns:
            for kw in keywords:
                if kw in company:
                    return ContextRecommendation(
                        target_field='industry',
                        suggested_value=industry,
                        confidence=0.70,
                        source='COMPANY_KEYWORD',
                        explanation=f'公司名称包含"{kw}"，推断为{industry}行业',
                        related_fields=['company'],
                    )
        return None

    def _infer_name_from_email(self, email: str, _ctx: Dict[str, Any]) -> Optional[ContextRecommendation]:
        """从邮箱前缀推测可能的姓名或账号"""
        if not email or '@' not in email:
            return None
        prefix = email.split('@')[0]
        if len(prefix) >= 2:
            cleaned = prefix.replace('.', '').replace('_', '').replace('-', '')
            if 2 <= len(cleaned) <= 6 and all('\u4e00' <= c <= '\u9fff' or c.isalpha() for c in cleaned):
                return ContextRecommendation(
                    target_field='name',
                    suggested_value=cleaned,
                    confidence=0.55,
                    source='EMAIL_PREFIX',
                    explanation=f'根据邮箱前缀"{prefix}"推测',
                    related_fields=['email'],
                )
        return None

    # ===================== 主推理方法 =====================

    def analyze_context(
        self,
        filled_fields: Dict[str, FieldContext],
        target_fields: Optional[List[str]] = None,
        exclude_fields: Optional[List[str]] = None,
    ) -> List[ContextRecommendation]:
        """
        分析已填写的字段上下文，生成所有适用的推荐

        Args:
            filled_fields: 已填写字段字典 {field_name: FieldContext}
            target_fields: 目标字段列表，如指定则仅针对这些字段生成推荐
            exclude_fields: 排除字段列表，不针对这些字段生成推荐

        Returns:
            推荐结果列表，按置信度降序排列
        """
        recommendations: List[ContextRecommendation] = []
        exclude = set(exclude_fields or [])

        filled_names = set(filled_fields.keys())
        logger.debug(f'分析上下文，已填写字段: {filled_names}')

        for rule in self._field_relation_rules:
            matched_source = None
            source_value = None

            for src_field in rule['source_fields']:
                if src_field in filled_names:
                    matched_source = src_field
                    source_value = filled_fields[src_field].value
                    break

            if matched_source is None or source_value is None:
                continue

            applicable_targets = [
                t for t in rule['target_fields']
                if t not in filled_names and t not in exclude
            ]

            if target_fields:
                applicable_targets = [t for t in applicable_targets if t in target_fields]

            if not applicable_targets:
                continue

            try:
                ctx = {
                    'all_fields': {k: v.value for k, v in filled_fields.items()},
                    'source_field': matched_source,
                }
                rec = rule['handler'](str(source_value), ctx)
                if rec and rec.suggested_value is not None:
                    rec.target_field = applicable_targets[0]
                    rec.confidence = round(min(rec.confidence, rule['confidence']), 3)
                    recommendations.append(rec)
                    logger.debug(
                        f'上下文推荐: {rec.target_field} = {rec.suggested_value} '
                        f'(置信度: {rec.confidence}, 来源: {rec.source})'
                    )
            except Exception as e:
                logger.warning(f'执行规则 {rule["name"]} 出错: {e}')

        recommendations.sort(key=lambda r: r.confidence, reverse=True)
        return recommendations

    def get_field_completion_suggestions(
        self,
        filled_fields: Dict[str, Any],
        field_definitions: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        获取完整表单补全建议，返回建议填充的字段值

        Args:
            filled_fields: 已填写的字段值 {field_name: value}
            field_definitions: 字段定义列表，用于获取字段元信息

        Returns:
            建议填充的字段 {field_name: {'value': ..., 'confidence': ..., 'source': ...}}
        """
        contexts = {}
        for fname, fval in filled_fields.items():
            if fval is not None and fval != '':
                field_type = None
                field_label = None
                if field_definitions:
                    fd = next((f for f in field_definitions if f.get('fieldName') == fname), None)
                    if fd:
                        field_type = fd.get('inputType')
                        field_label = fd.get('fieldLabel')
                contexts[fname] = FieldContext(
                    field_name=fname,
                    value=fval,
                    field_type=field_type,
                    field_label=field_label,
                )

        target_fields = None
        if field_definitions:
            target_fields = [f.get('fieldName') for f in field_definitions if f.get('fieldName') not in contexts]

        recommendations = self.analyze_context(contexts, target_fields=target_fields)

        result = {}
        for rec in recommendations:
            if rec.target_field not in result:
                result[rec.target_field] = {
                    'value': rec.suggested_value,
                    'confidence': rec.confidence,
                    'source': rec.source,
                    'explanation': rec.explanation,
                    'relatedFields': rec.related_fields,
                }
        return result


# 全局单例
_recommender = ContextAwareRecommender()


def get_recommender() -> ContextAwareRecommender:
    """获取上下文推荐器单例"""
    return _recommender


def analyze_form_context(
    filled_fields: Dict[str, Any],
    field_definitions: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """便捷函数：分析表单上下文并返回补全建议"""
    return get_recommender().get_field_completion_suggestions(filled_fields, field_definitions)
