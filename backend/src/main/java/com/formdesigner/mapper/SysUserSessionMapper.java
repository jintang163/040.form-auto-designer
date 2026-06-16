package com.formdesigner.mapper;

import com.formdesigner.entity.SysUserSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface SysUserSessionMapper {

    SysUserSession selectBySessionId(@Param("sessionId") String sessionId);

    List<SysUserSession> selectByUserId(@Param("userId") String userId);

    int insert(SysUserSession session);

    int deleteBySessionId(@Param("sessionId") String sessionId);

    int deleteExpired(@Param("now") LocalDateTime now);
}
