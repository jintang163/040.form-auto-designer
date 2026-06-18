"""
字段类型智能推荐模块
根据字段类型、字段名称语义和业务规则，自动生成填报建议和默认值

支持的智能推荐：
- 日期类型 → 默认今天、当前月、当前年
- 时间类型 → 默认当前时间
- 姓名/称谓 → 根据性别智能推断
- 地址 → 根据IP或历史数据智能补全
- 邮箱 → 根据姓名自动生成
- 工号/编号 → 自动递增建议
- 年龄 → 根据出生日期自动计算
- 各类格式示例 → 为用户提供填写参考
"""
from typing import Any, Dict, List, Optional, Tuple, Callable
from dataclasses import dataclass, field
from datetime import datetime, date
from loguru import logger


@dataclass
class FieldTypeRecommendation:
    """字段类型推荐结果"""
    target_field: str
    suggested_value: Any
    confidence: float
    source: str
    explanation: str
    example_values: List[str] = field(default_factory=list)
    related_fields: List[str] = field(default_factory=list)
    fill_hint: str = ""  


@dataclass
class SemanticFieldDef:
    """语义字段定义"""
    field_name: str
    field_label: Optional[str] = None
    input_type: Optional[str] = None
    field_type: Optional[str] = None


class FieldTypeRecommender:
    """字段类型智能推荐器"""

    def __init__(self):
        self._semantic_rules = self._init_semantic_rules()
        self._type_based_rules = self._init_type_based_rules()
        self._example_generators = self._init_example_generators()

    def _init_semantic_rules(self) -> List[Dict[str, Any]]:
        """初始化语义匹配规则库
        通过字段名称/标签识别字段含义，生成对应默认值
        """
        now = datetime.now()
        today = date.today()

        return [
            {
                'name': 'date_today',
                'match_keywords': ['日期', 'date', '填写日期', '填报日期', '申请日期', '提交日期', '记录日期'],
                'match_input_types': ['date'],
                'value_generator': lambda ctx: today.strftime('%Y-%m-%d'),
                'confidence': 0.95,
                'explanation': '日期默认为今天',
                'examples': [today.strftime('%Y-%m-%d'), '2024-01-15', '2024-12-31'],
                'fill_hint': '请选择日期，格式：YYYY-MM-DD',
            },
            {
                'name': 'birthday_default',
                'match_keywords': ['生日', '出生日期', 'birthDate', 'birthday', '出生年月'],
                'match_input_types': ['date'],
                'value_generator': lambda ctx: None,  
                'confidence': 0.0,
                'explanation': '请选择您的出生日期',
                'examples': ['1990-01-15', '1995-06-20', '2000-12-31'],
                'fill_hint': '请选择出生日期，格式：YYYY-MM-DD',
            },
            {
                'name': 'start_date_today',
                'match_keywords': ['开始日期', 'startDate', '起始日期', '生效日期', '入职日期'],
                'match_input_types': ['date'],
                'value_generator': lambda ctx: today.strftime('%Y-%m-%d'),
                'confidence': 0.85,
                'explanation': '开始日期建议默认为今天',
                'examples': [today.strftime('%Y-%m-%d'), '2024-01-01'],
                'fill_hint': '请选择开始日期，格式：YYYY-MM-DD',
            },
            {
                'name': 'end_date_next_month',
                'match_keywords': ['结束日期', 'endDate', '截止日期', '到期日期', '失效日期'],
                'match_input_types': ['date'],
                'value_generator': lambda ctx: self._add_months(today, 1).strftime('%Y-%m-%d'),
                'confidence': 0.75,
                'explanation': '结束日期建议为一个月后',
                'examples': [self._add_months(today, 1).strftime('%Y-%m-%d')],
                'fill_hint': '请选择结束日期，格式：YYYY-MM-DD',
            },
            {
                'name': 'year_current',
                'match_keywords': ['年份', 'year', '年度', '所属年份'],
                'match_input_types': ['number', 'text'],
                'value_generator': lambda ctx: str(today.year),
                'confidence': 0.95,
                'explanation': '年份默认为今年',
                'examples': [str(today.year), str(today.year - 1)],
                'fill_hint': '请输入4位年份，如：2024',
            },
            {
                'name': 'month_current',
                'match_keywords': ['月份', 'month', '月度', '所属月份'],
                'match_input_types': ['number', 'text'],
                'value_generator': lambda ctx: f'{today.month:02d}',
                'confidence': 0.90,
                'explanation': '月份默认为本月',
                'examples': [f'{today.month:02d}', '01', '12'],
                'fill_hint': '请输入月份，1-12',
            },
            {
                'name': 'quarter_current',
                'match_keywords': ['季度', 'quarter', '所属季度'],
                'match_input_types': ['number', 'text', 'select'],
                'value_generator': lambda ctx: f'Q{((today.month - 1) // 3) + 1}',
                'confidence': 0.85,
                'explanation': '季度默认为本季度',
                'examples': ['Q1', 'Q2', 'Q3', 'Q4'],
                'fill_hint': '请选择季度，如：Q1表示第一季度',
            },
            {
                'name': 'datetime_now',
                'match_keywords': ['时间', 'datetime', '填写时间', '提交时间', '创建时间'],
                'match_input_types': ['date'],
                'value_generator': lambda ctx: now.strftime('%Y-%m-%d %H:%M:%S'),
                'confidence': 0.95,
                'explanation': '时间默认为当前时间',
                'examples': [now.strftime('%Y-%m-%d %H:%M:%S')],
                'fill_hint': '格式：YYYY-MM-DD HH:MM:SS',
            },
            {
                'name': 'age_calculate',
                'match_keywords': ['年龄', 'age'],
                'match_input_types': ['number'],
                'value_generator': lambda ctx: self._calculate_age_from_context(ctx),
                'confidence': 0.90,
                'explanation': '根据出生日期自动计算年龄',
                'examples': ['25', '30', '45'],
                'fill_hint': '请输入周岁年龄',
                'depends_on': ['birthday', 'birthDate', '出生日期', '出生年月'],
            },
            {
                'name': 'gender_default',
                'match_keywords': ['性别', 'gender', 'sex'],
                'match_input_types': ['select', 'radio'],
                'value_generator': lambda ctx: self._infer_gender_from_context(ctx),
                'confidence': 0.70,
                'explanation': '根据姓名或身份证号推断性别',
                'examples': ['男', '女'],
                'fill_hint': '请选择性别',
                'depends_on': ['name', '姓名', 'idCard', '身份证号'],
            },
            {
                'name': 'email_suggest',
                'match_keywords': ['邮箱', 'email', '电子邮箱', 'mail'],
                'match_input_types': ['text'],
                'value_generator': lambda ctx: self._generate_email_from_context(ctx),
                'confidence': 0.60,
                'explanation': '根据姓名自动生成邮箱建议',
                'examples': ['zhangsan@example.com', 'li_si@company.com', 'wangwu123@org.cn'],
                'fill_hint': '请输入有效邮箱地址',
                'depends_on': ['name', '姓名', 'userId', '工号'],
            },
            {
                'name': 'phone_example',
                'match_keywords': ['电话', '手机', 'phone', 'mobile', '联系电话'],
                'match_input_types': ['text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请输入11位手机号码',
                'examples': ['13800138000', '13912345678', '15011112222'],
                'fill_hint': '请输入11位手机号码，如：13800138000',
            },
            {
                'name': 'idcard_example',
                'match_keywords': ['身份证', 'idCard', '身份证号', '证件号码'],
                'match_input_types': ['text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请输入18位身份证号码',
                'examples': ['110101199001011234', '310101199506201234'],
                'fill_hint': '请输入18位身份证号码',
            },
            {
                'name': 'employee_id_suggest',
                'match_keywords': ['工号', 'employeeId', '员工编号', '职工号'],
                'match_input_types': ['text', 'number'],
                'value_generator': lambda ctx: self._generate_employee_id(ctx),
                'confidence': 0.50,
                'explanation': '自动生成建议工号',
                'examples': ['EMP001', '2024001', 'HR-001'],
                'fill_hint': '请输入员工编号',
            },
            {
                'name': 'address_suggest',
                'match_keywords': ['地址', 'address', '住址', '居住地址', '联系地址'],
                'match_input_types': ['text', 'textarea'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请填写详细地址',
                'examples': ['北京市朝阳区建国路88号', '上海市浦东新区陆家嘴金融中心'],
                'fill_hint': '请填写省市区街道详细地址',
            },
            {
                'name': 'zipcode_example',
                'match_keywords': ['邮编', 'postalCode', 'zipcode', '邮政编码'],
                'match_input_types': ['text'],
                'value_generator': lambda ctx: self._infer_zipcode_from_context(ctx),
                'confidence': 0.70,
                'explanation': '根据地址推断邮编',
                'examples': ['100000', '200000', '510000'],
                'fill_hint': '请输入6位邮政编码',
                'depends_on': ['address', '地址', 'city', '城市'],
            },
            {
                'name': 'country_default',
                'match_keywords': ['国家', 'country', '国籍'],
                'match_input_types': ['select', 'text'],
                'value_generator': lambda ctx: '中国',
                'confidence': 0.80,
                'explanation': '国家默认为中国',
                'examples': ['中国', '美国', '日本', '韩国'],
                'fill_hint': '请选择或输入国家名称',
            },
            {
                'name': 'nationality_default',
                'match_keywords': ['民族', 'nationality'],
                'match_input_types': ['select', 'text'],
                'value_generator': lambda ctx: '汉族',
                'confidence': 0.75,
                'explanation': '民族默认为汉族',
                'examples': ['汉族', '满族', '回族', '蒙古族'],
                'fill_hint': '请选择或输入民族',
            },
            {
                'name': 'marital_status_suggest',
                'match_keywords': ['婚姻状况', 'maritalStatus', '婚姻'],
                'match_input_types': ['select'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请选择婚姻状况',
                'examples': ['未婚', '已婚', '离异', '丧偶'],
                'fill_hint': '请选择婚姻状况',
            },
            {
                'name': 'education_suggest',
                'match_keywords': ['学历', 'education', '文化程度'],
                'match_input_types': ['select'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请选择最高学历',
                'examples': ['大专', '本科', '硕士', '博士', '高中'],
                'fill_hint': '请选择最高学历',
            },
            {
                'name': 'department_suggest',
                'match_keywords': ['部门', 'department', '所属部门'],
                'match_input_types': ['select', 'text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请选择所属部门',
                'examples': ['技术部', '产品部', '运营部', '市场部', '人力资源部'],
                'fill_hint': '请选择或输入部门名称',
            },
            {
                'name': 'position_suggest',
                'match_keywords': ['职位', 'position', '岗位', '职务'],
                'match_input_types': ['select', 'text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请输入职位名称',
                'examples': ['工程师', '经理', '总监', '助理', '专员'],
                'fill_hint': '请输入职位名称',
            },
            {
                'name': 'salary_example',
                'match_keywords': ['薪资', 'salary', '月薪', '工资', '收入'],
                'match_input_types': ['number'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请输入月薪金额',
                'examples': ['8000', '15000', '25000', '50000'],
                'fill_hint': '请输入月薪金额（单位：元）',
            },
            {
                'name': 'work_years_example',
                'match_keywords': ['工作年限', 'workYears', '工龄', '工作经验'],
                'match_input_types': ['number'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请输入工作年限',
                'examples': ['1', '3', '5', '10'],
                'fill_hint': '请输入工作年限（单位：年）',
            },
            {
                'name': 'emergency_contact_example',
                'match_keywords': ['紧急联系人', 'emergencyContact', '紧急联系电话'],
                'match_input_types': ['text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请填写紧急联系人信息',
                'examples': ['张三 13800138000', '李四（配偶） 13912345678'],
                'fill_hint': '格式：姓名 关系 电话，如：张三 父亲 13800138000',
            },
            {
                'name': 'bank_account_example',
                'match_keywords': ['银行账号', 'bankAccount', '银行卡号', '账号'],
                'match_input_types': ['text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请输入银行卡号',
                'examples': ['6222021234567890123', '6217001234567890123'],
                'fill_hint': '请输入银行卡号（16-19位数字）',
            },
            {
                'name': 'bank_name_example',
                'match_keywords': ['开户银行', 'bankName', '开户行'],
                'match_input_types': ['select', 'text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请选择开户银行',
                'examples': ['中国工商银行', '中国建设银行', '中国农业银行', '中国银行', '招商银行'],
                'fill_hint': '请选择或输入银行名称',
            },
            {
                'name': 'hobby_example',
                'match_keywords': ['爱好', 'hobby', '兴趣爱好', '特长'],
                'match_input_types': ['text', 'textarea', 'multiSelect'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请填写兴趣爱好',
                'examples': ['阅读、游泳、音乐', '篮球、编程、摄影'],
                'fill_hint': '请用逗号分隔多个爱好',
            },
            {
                'name': 'remark_example',
                'match_keywords': ['备注', 'remark', '说明', '备注说明', '其他说明'],
                'match_input_types': ['textarea', 'text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '如有其他需要说明的事项请在此填写',
                'examples': ['无特殊说明', '需要加班支持', '异地办公'],
                'fill_hint': '请填写其他需要说明的内容',
            },
            {
                'name': 'reason_example',
                'match_keywords': ['原因', 'reason', '申请原因', '说明原因'],
                'match_input_types': ['textarea', 'text'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请简要说明原因',
                'examples': ['个人发展需要', '业务拓展需求', '工作调动'],
                'fill_hint': '请简要说明原因（建议30字以内）',
            },
            {
                'name': 'quantity_default',
                'match_keywords': ['数量', 'quantity', '个数', '件数'],
                'match_input_types': ['number'],
                'value_generator': lambda ctx: '1',
                'confidence': 0.70,
                'explanation': '数量默认为1',
                'examples': ['1', '5', '10', '50'],
                'fill_hint': '请输入数量',
            },
            {
                'name': 'price_example',
                'match_keywords': ['价格', 'price', '单价', '金额'],
                'match_input_types': ['number'],
                'value_generator': lambda ctx: None,
                'confidence': 0.0,
                'explanation': '请输入金额',
                'examples': ['99.99', '199.00', '1299.00'],
                'fill_hint': '请输入金额（单位：元，保留2位小数）',
            },
            {
                'name': 'priority_default',
                'match_keywords': ['优先级', 'priority', '紧急程度'],
                'match_input_types': ['select', 'radio'],
                'value_generator': lambda ctx: '中',
                'confidence': 0.75,
                'explanation': '优先级默认为中',
                'examples': ['低', '中', '高', '紧急'],
                'fill_hint': '请选择优先级',
            },
            {
                'name': 'status_default',
                'match_keywords': ['状态', 'status', '申请状态'],
                'match_input_types': ['select'],
                'value_generator': lambda ctx: '待审批',
                'confidence': 0.80,
                'explanation': '状态默认为待审批',
                'examples': ['待审批', '审批中', '已通过', '已拒绝'],
                'fill_hint': '请选择状态',
            },
        ]

    def _init_type_based_rules(self) -> Dict[str, Dict[str, Any]]:
        """初始化基于输入类型的通用规则"""
        today = date.today()
        now = datetime.now()

        return {
            'date': {
                'default_value': today.strftime('%Y-%m-%d'),
                'examples': [today.strftime('%Y-%m-%d'), '2024-01-15', '2024-12-31'],
                'fill_hint': '请选择日期，格式：YYYY-MM-DD',
                'confidence': 0.80,
                'explanation': '日期字段默认值为今天',
            },
            'number': {
                'default_value': '0',
                'examples': ['0', '100', '999.99'],
                'fill_hint': '请输入数字',
                'confidence': 0.50,
                'explanation': '数字字段默认值为0',
            },
            'text': {
                'default_value': None,
                'examples': ['请输入文本内容'],
                'fill_hint': '请输入文本内容',
                'confidence': 0.0,
                'explanation': '文本字段需手动填写',
            },
            'textarea': {
                'default_value': None,
                'examples': ['请输入详细描述内容'],
                'fill_hint': '请输入详细描述内容',
                'confidence': 0.0,
                'explanation': '多行文本字段需手动填写',
            },
            'select': {
                'default_value': None,
                'examples': ['请从下拉列表中选择'],
                'fill_hint': '请从下拉列表中选择',
                'confidence': 0.0,
                'explanation': '下拉选择字段需选择选项',
            },
            'multiSelect': {
                'default_value': None,
                'examples': ['可选择多个选项'],
                'fill_hint': '可选择多个选项',
                'confidence': 0.0,
                'explanation': '多选字段需选择选项',
            },
            'fileUpload': {
                'default_value': None,
                'examples': ['支持jpg、png、pdf等格式'],
                'fill_hint': '请上传文件，支持jpg、png、pdf等格式，单个文件不超过10MB',
                'confidence': 0.0,
                'explanation': '文件上传字段需上传文件',
            },
        }

    def _init_example_generators(self) -> Dict[str, Callable]:
        """初始化示例值生成器"""
        return {
            'name': self._generate_name_examples,
            'address': self._generate_address_examples,
            'email': self._generate_email_examples,
            'phone': self._generate_phone_examples,
            'idcard': self._generate_idcard_examples,
        }

    # ===================== 辅助方法 =====================

    @staticmethod
    def _add_months(d: date, months: int) -> date:
        """日期增加月份"""
        month = d.month - 1 + months
        year = d.year + month // 12
        month = month % 12 + 1
        day = min(d.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
        return date(year, month, day)

    @staticmethod
    def _calculate_age(birth_date_str: str) -> Optional[int]:
        """根据出生日期计算年龄"""
        try:
            birth_date = datetime.strptime(birth_date_str, '%Y-%m-%d').date()
            today = date.today()
            age = today.year - birth_date.year
            if (today.month, today.day) < (birth_date.month, birth_date.day):
                age -= 1
            return age if 0 <= age <= 150 else None
        except (ValueError, TypeError):
            return None

    def _calculate_age_from_context(self, ctx: Dict[str, Any]) -> Optional[str]:
        """从上下文中提取出生日期并计算年龄"""
        filled_fields = ctx.get('filled_fields', {})
        birthday_fields = ['birthday', 'birthDate', '出生日期', '出生年月']
        for field in birthday_fields:
            if field in filled_fields and filled_fields[field]:
                age = self._calculate_age(str(filled_fields[field]))
                if age:
                    return str(age)
        return None

    def _infer_gender_from_context(self, ctx: Dict[str, Any]) -> Optional[str]:
        """从上下文推断性别"""
        filled_fields = ctx.get('filled_fields', {})
        
        idcard_fields = ['idCard', '身份证号', '身份证']
        for field in idcard_fields:
            if field in filled_fields and filled_fields[field]:
                id_card = str(filled_fields[field])
                if len(id_card) >= 17:
                    try:
                        gender_digit = int(id_card[16])
                        return '男' if gender_digit % 2 == 1 else '女'
                    except (ValueError, IndexError):
                        pass
        
        name_fields = ['name', '姓名', 'realName']
        for field in name_fields:
            if field in filled_fields and filled_fields[field]:
                name = str(filled_fields[field])
                if len(name) >= 2:
                    female_chars = set('秀兰娟英华慧敏丽娜芳艳丹洁红婷敏霞燕玲桂娣瑞荣琴妹晶华雪爱梅琳素云莲真雪环')
                    male_chars = set('伟强磊军勇杰涛峰华明刚平辉鹏腾飞林波斌宇浩凯健俊帅威晨阳博')
                    last_char = name[-1]
                    if last_char in female_chars:
                        return '女'
                    elif last_char in male_chars:
                        return '男'
        return None

    def _generate_email_from_context(self, ctx: Dict[str, Any]) -> Optional[str]:
        """根据姓名生成邮箱建议"""
        filled_fields = ctx.get('filled_fields', {})
        name_fields = ['name', '姓名', 'userId', '工号']
        for field in name_fields:
            if field in filled_fields and filled_fields[field]:
                name = str(filled_fields[field]).strip()
                if name:
                    import re
                    pinyin = re.sub(r'[^a-zA-Z0-9]', '', name.lower())
                    if not pinyin:
                        pinyin = 'user'
                    return f'{pinyin}@example.com'
        return None

    def _generate_employee_id(self, ctx: Dict[str, Any]) -> Optional[str]:
        """生成建议工号"""
        today = date.today()
        seq = ctx.get('next_sequence', 1)
        return f'{today.year}{seq:04d}'

    def _infer_zipcode_from_context(self, ctx: Dict[str, Any]) -> Optional[str]:
        """根据地址推断邮编"""
        filled_fields = ctx.get('filled_fields', {})
        address_fields = ['address', '地址', 'city', '城市', 'province', '省份']
        zipcode_map = {
            '北京': '100000', '上海': '200000', '广州': '510000', '深圳': '518000',
            '杭州': '310000', '南京': '210000', '成都': '610000', '武汉': '430000',
            '西安': '710000', '重庆': '400000', '天津': '300000', '苏州': '215000',
        }
        for field in address_fields:
            if field in filled_fields and filled_fields[field]:
                address = str(filled_fields[field])
                for city, zipcode in zipcode_map.items():
                    if city in address:
                        return zipcode
        return None

    # ===================== 示例生成器 =====================

    def _generate_name_examples(self) -> List[str]:
        return ['张三', '李四', '王五', '赵六', '陈七']

    def _generate_address_examples(self) -> List[str]:
        return [
            '北京市朝阳区建国路88号SOHO现代城',
            '上海市浦东新区陆家嘴环路1000号',
            '广州市天河区珠江新城华夏路8号',
        ]

    def _generate_email_examples(self) -> List[str]:
        return ['zhangsan@example.com', 'li_si@company.com', 'wangwu123@org.cn']

    def _generate_phone_examples(self) -> List[str]:
        return ['13800138000', '13912345678', '15011112222']

    def _generate_idcard_examples(self) -> List[str]:
        return ['110101199001011234', '310101199506201234', '440101200012311234']

    # ===================== 主推荐方法 =====================

    def _match_semantic_rule(
        self,
        field_def: SemanticFieldDef,
        filled_fields: Dict[str, Any]
    ) -> Optional[FieldTypeRecommendation]:
        """匹配语义规则"""
        field_text = f"{field_def.field_name} {field_def.field_label or ''}".lower()

        for rule in self._semantic_rules:
            match = False
            
            for kw in rule['match_keywords']:
                if kw.lower() in field_text:
                    match = True
                    break
            
            if match and rule['match_input_types']:
                input_type = field_def.input_type or ''
                if input_type not in rule['match_input_types']:
                    match = False
            
            if match:
                ctx = {'filled_fields': filled_fields}
                try:
                    suggested_value = rule['value_generator'](ctx)
                    examples = rule.get('examples', [])
                    fill_hint = rule.get('fill_hint', '')
                    
                    if not examples:
                        example_gen = self._example_generators.get(rule['name'].split('_')[0])
                        if example_gen:
                            examples = example_gen()
                    
                    return FieldTypeRecommendation(
                        target_field=field_def.field_name,
                        suggested_value=suggested_value,
                        confidence=rule['confidence'],
                        source='SEMANTIC_MATCH',
                        explanation=rule['explanation'],
                        example_values=examples,
                        related_fields=rule.get('depends_on', []),
                        fill_hint=fill_hint,
                    )
                except Exception as e:
                    logger.warning(f"执行语义规则 {rule['name']} 出错: {e}")
                    continue
        
        return None

    def _match_type_rule(
        self,
        field_def: SemanticFieldDef
    ) -> Optional[FieldTypeRecommendation]:
        """匹配类型规则"""
        input_type = field_def.input_type
        if not input_type:
            return None
        
        type_rule = self._type_based_rules.get(input_type)
        if not type_rule:
            return None
        
        return FieldTypeRecommendation(
            target_field=field_def.field_name,
            suggested_value=type_rule.get('default_value'),
            confidence=type_rule.get('confidence', 0.0),
            source='TYPE_BASED',
            explanation=type_rule.get('explanation', ''),
            example_values=type_rule.get('examples', []),
            fill_hint=type_rule.get('fill_hint', ''),
        )

    def recommend_for_field(
        self,
        field_def: SemanticFieldDef,
        filled_fields: Optional[Dict[str, Any]] = None
    ) -> Optional[FieldTypeRecommendation]:
        """
        为单个字段生成推荐
        
        Args:
            field_def: 字段定义
            filled_fields: 已填写的字段上下文
            
        Returns:
            推荐结果，无推荐时返回None
        """
        filled = filled_fields or {}
        
        if field_def.field_name in filled:
            return None
        
        semantic_rec = self._match_semantic_rule(field_def, filled)
        if semantic_rec and semantic_rec.confidence > 0:
            logger.debug(
                f"语义匹配推荐: {field_def.field_name} = {semantic_rec.suggested_value} "
                f"(置信度: {semantic_rec.confidence})"
            )
            return semantic_rec
        
        type_rec = self._match_type_rule(field_def)
        if type_rec and type_rec.confidence > 0:
            logger.debug(
                f"类型匹配推荐: {field_def.field_name} = {type_rec.suggested_value} "
                f"(置信度: {type_rec.confidence})"
            )
            return type_rec
        
        if semantic_rec:
            return semantic_rec
        
        return None

    def recommend_for_form(
        self,
        field_definitions: List[Dict[str, Any]],
        filled_fields: Optional[Dict[str, Any]] = None,
        target_fields: Optional[List[str]] = None,
        exclude_fields: Optional[List[str]] = None,
    ) -> List[FieldTypeRecommendation]:
        """
        为整个表单生成推荐
        
        Args:
            field_definitions: 字段定义列表
            filled_fields: 已填写的字段值
            target_fields: 目标字段列表，如指定则仅针对这些字段
            exclude_fields: 排除字段列表
            
        Returns:
            推荐结果列表，按置信度降序排列
        """
        recommendations: List[FieldTypeRecommendation] = []
        filled = filled_fields or {}
        exclude = set(exclude_fields or [])
        
        for fd in field_definitions:
            field_name = fd.get('fieldName')
            if not field_name:
                continue
            if field_name in filled and filled[field_name]:
                continue
            if field_name in exclude:
                continue
            if target_fields and field_name not in target_fields:
                continue
            
            field_def = SemanticFieldDef(
                field_name=field_name,
                field_label=fd.get('fieldLabel'),
                input_type=fd.get('inputType'),
                field_type=fd.get('fieldType'),
            )
            
            rec = self.recommend_for_field(field_def, filled)
            if rec:
                recommendations.append(rec)
        
        recommendations.sort(key=lambda r: r.confidence, reverse=True)
        return recommendations

    def get_all_semantic_rules(self) -> List[Dict[str, Any]]:
        """获取所有语义规则"""
        return [
            {
                'name': rule['name'],
                'matchKeywords': rule['match_keywords'],
                'matchInputTypes': rule['match_input_types'],
                'confidence': rule['confidence'],
                'explanation': rule['explanation'],
                'examples': rule.get('examples', []),
                'fillHint': rule.get('fill_hint', ''),
            }
            for rule in self._semantic_rules
        ]


_recommender = FieldTypeRecommender()


def get_field_type_recommender() -> FieldTypeRecommender:
    """获取字段类型推荐器单例"""
    return _recommender


def generate_field_recommendations(
    field_definitions: List[Dict[str, Any]],
    filled_fields: Optional[Dict[str, Any]] = None,
    target_fields: Optional[List[str]] = None,
    exclude_fields: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """便捷函数：生成字段推荐"""
    recs = get_field_type_recommender().recommend_for_form(
        field_definitions, filled_fields, target_fields, exclude_fields
    )
    return [
        {
            'targetField': r.target_field,
            'suggestedValue': r.suggested_value,
            'confidence': r.confidence,
            'source': r.source,
            'explanation': r.explanation,
            'exampleValues': r.example_values,
            'relatedFields': r.related_fields,
            'fillHint': r.fill_hint,
        }
        for r in recs
    ]
