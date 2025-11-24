import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, DollarOutlined } from '@ant-design/icons';

const StatsCard = ({ stats, loading }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="总收入"
            value={stats?.income || 0}
            precision={2}
            prefix={<ArrowUpOutlined />}
            valueStyle={{ color: '#3f8600' }}
            suffix="元"
            loading={loading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="总支出"
            value={stats?.expense || 0}
            precision={2}
            prefix={<ArrowDownOutlined />}
            valueStyle={{ color: '#cf1322' }}
            suffix="元"
            loading={loading}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card>
          <Statistic
            title="余额"
            value={stats?.balance || 0}
            precision={2}
            prefix={<DollarOutlined />}
            valueStyle={{ 
              color: (stats?.balance || 0) >= 0 ? '#3f8600' : '#cf1322' 
            }}
            suffix="元"
            loading={loading}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default StatsCard;

