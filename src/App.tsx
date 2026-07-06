import { useState } from 'react'
import { Button, ConfigProvider, Layout, Menu, Typography, theme } from 'antd'
import {
  ApiOutlined,
  AuditOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import './App.css'
import MonitorQueuePage from './pages/MonitorQueuePage'
import PrescriptionPage from './pages/PrescriptionPage'
import ProcessTrackingPage from './pages/ProcessTrackingPage'
import MachineInventoryPage from './pages/MachineInventoryPage'
import MachineSimPage from './pages/MachineSimPage'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

function App() {
  const [activePage, setActivePage] = useState('monitor')
  const [collapsed, setCollapsed] = useState(false)
  const { token } = theme.useToken()

  const renderPage = () => {
    switch (activePage) {
      case 'prescription':
        return <PrescriptionPage />
      case 'process':
        return <ProcessTrackingPage />
      case 'inventory':
        return <MachineInventoryPage />
      case 'machine-sim':
        return <MachineSimPage />
      default:
        return <MonitorQueuePage />
    }
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#FE7F2D',
          colorBgContainer: '#ffffff',
          colorBorder: '#F5E1C8',
          colorText: '#2F241D',
        },
      }}
    >
      <Layout className="app-shell">
        <Sider
          width={240}
          collapsedWidth={80}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          className="app-sider"
        >
          <div className="sidebar-top-actions">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((value) => !value)}
              className="sidebar-toggle"
            />
          </div>

          <div className={`brand-block ${collapsed ? 'collapsed' : ''}`}>
            <div className="brand-icon">✚</div>
            {!collapsed && (
              <div>
                <Title level={4} style={{ margin: 0, color: '#fff' }}>
                  Medical Mock
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Operations Center</Text>
              </div>
            )}
          </div>

          <Menu
            mode="inline"
            inlineCollapsed={collapsed}
            selectedKeys={[activePage]}
            onClick={({ key }) => setActivePage(key)}
            items={[
              { key: 'monitor', icon: <DashboardOutlined />, label: 'Monitor Queue' },
              { key: 'prescription', icon: <ExperimentOutlined />, label: 'Prescription Managements' },
              { key: 'process', icon: <AuditOutlined />, label: 'Process Tracking' },
              { key: 'inventory', icon: <ToolOutlined />, label: 'Machine Inventory' },
              { key: 'machine-sim', icon: <ApiOutlined />, label: 'Machine Sim' },
            ]}
            style={{ background: 'transparent', border: 'none', color: '#fff' }}
          />
        </Sider>

        <Layout>
          <Header className="app-header" style={{ background: token.colorBgContainer }}>
            <div>
              <Text type="secondary">Clinical Operations</Text>
              <Title level={3} style={{ margin: '4px 0 0' }}>
                {activePage === 'monitor' && 'Monitor Queue'}
                {activePage === 'prescription' && 'Prescription Managements'}
                {activePage === 'process' && 'Process Tracking'}
                {activePage === 'inventory' && 'Machine Inventory'}
                {activePage === 'machine-sim' && 'Machine Sim'}
              </Title>
            </div>
          </Header>
          <Content className="app-content">{renderPage()}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}

export default App
