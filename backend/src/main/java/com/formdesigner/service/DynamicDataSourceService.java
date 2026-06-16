package com.formdesigner.service;

import java.util.List;
import java.util.Map;

public interface DynamicDataSourceService {

    List<Map<String, String>> fetchOptions(String url);
}
