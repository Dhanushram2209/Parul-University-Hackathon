import React from 'react';
import { Layout, Menu, Typography, Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { UserOutlined, TeamOutlined, SettingOutlined, DashboardOutlined, SafetyOutlined } from '@ant-design/icons';
import Header from '../../../components/Header';
import './AdminDashboard.css';

const { Header: AntHeader, Content, Sider } = Layout;
const { Title, Text } = Typography;

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    render: (text) => <Text strong>{text}</Text>,
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Role',
    dataIndex: 'role',
    key: 'role',
    render: (role) => (
      <Tag color={role === 'admin' ? 'red' : role === 'doctor' ? 'blue' : 'green'}>
        {role.toUpperCase()}
      </Tag>
    ),
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    render: (status) => (
      <Tag color={status === 'active' ? 'success' : 'default'}>
        {status.toUpperCase()}
      </Tag>
    ),
  },
];

const data = [
  {
    key: '1',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
  },
  {
    key: '2',
    name: 'Dr. Smith',
    email: 'doctor@example.com',
    role: 'doctor',
    status: 'active',
  },
  {
    key: '3',
    name: 'John Patient',
    email: 'patient@example.com',
    role: 'patient',
    status: 'active',
  },
  {
    key: '4',
    name: 'Dr. Johnson',
    email: 'johnson@example.com',
    role: 'doctor',
    status: 'inactive',
  },
];

const AdminDashboard = () => {
  return (
    <Layout className="admin-dashboard">
      <Sider width={250} className="dashboard-sider">
        <div className="dashboard-logo">
          <Title level={4} className="dashboard-title">
            <DashboardOutlined /> Admin Portal
          </Title>
        </div>
        <Menu
          theme="light"
          mode="inline"
          defaultSelectedKeys={['1']}
          className="dashboard-menu"
        >
          <Menu.Item key="1" icon={<DashboardOutlined />}>Dashboard</Menu.Item>
          <Menu.Item key="2" icon={<TeamOutlined />}>Users</Menu.Item>
          <Menu.Item key="3" icon={<SafetyOutlined />}>Doctors</Menu.Item>
          <Menu.Item key="4" icon={<SettingOutlined />}>Settings</Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <AntHeader className="dashboard-header">
          <Header />
        </AntHeader>
        <Content className="dashboard-content">
          <div className="dashboard-container">
            <Title level={3} className="dashboard-page-title">Admin Dashboard</Title>
            
            <Row gutter={[16, 16]} className="dashboard-stats">
              <Col xs={24} sm={12} md={8}>
                <Card className="dashboard-card" hoverable>
                  <Statistic title="Total Users" value={156} />
                  <Text type="secondary">24 new this month</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card className="dashboard-card" hoverable>
                  <Statistic title="Active Patients" value={124} />
                  <Text type="secondary">86% active rate</Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card className="dashboard-card" hoverable>
                  <Statistic title="Registered Doctors" value={22} />
                  <Text type="secondary">18 active, 4 pending</Text>
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="dashboard-sections">
              <Col xs={24}>
                <Card 
                  title="User Management" 
                  className="dashboard-section-card" 
                  hoverable
                  extra={<a href="#">View All</a>}
                >
                  <Table 
                    columns={columns} 
                    dataSource={data} 
                    size="middle" 
                    pagination={false}
                    className="user-table"
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="dashboard-sections">
              <Col xs={24} md={12}>
                <Card title="System Status" className="dashboard-section-card" hoverable>
                  <div className="system-status">
                    <div className="status-item">
                      <Tag color="success">Operational</Tag>
                      <Text strong style={{ marginLeft: 8 }}>API Server</Text>
                    </div>
                    <div className="status-item">
                      <Tag color="success">Operational</Tag>
                      <Text strong style={{ marginLeft: 8 }}>Database</Text>
                    </div>
                    <div className="status-item">
                      <Tag color="success">Operational</Tag>
                      <Text strong style={{ marginLeft: 8 }}>AI Services</Text>
                    </div>
                  </div>
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card title="Recent Activity" className="dashboard-section-card" hoverable>
                  <div className="activity-placeholder">
                    <Text type="secondary">No recent activity</Text>
                  </div>
                </Card>
              </Col>
            </Row>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminDashboard;