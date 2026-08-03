import { useEffect, useState } from 'react'
import { Button, ConfigProvider, Layout, Menu, Typography, theme } from 'antd'
import {
  ApartmentOutlined,
  ApiOutlined,
  AuditOutlined,
  BulbOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FormOutlined,
  InboxOutlined,
  MedicineBoxOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import './App.css'
import MonitorQueuePage from './pages/MonitorQueuePage'
import PrescriptionPage from './pages/PrescriptionPage'
import ProcessTrackingPage from './pages/ProcessTrackingPage'
import MachineInventoryPage from './pages/MachineInventoryPage'
import MachineSimPage from './pages/MachineSimPage'
import AddMedicinePage from './pages/AddMedicinePage'
import PrescribeMedicinePage from './pages/PrescribeMedicinePage'
import AddDepartmentPage from './pages/AddDepartmentPage'
import CobotTaskPage from './pages/CobotTaskPage'
import PharmacistRecheckPage from './pages/PharmacistRecheckPage'
import QueryBasketPage from './pages/QueryBasketPage'
import PackagedPouchesPage from './pages/PackagedPouchesPage'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

// Below this width the sider becomes an off-canvas overlay (see .app-sider's
// @media block in App.css) instead of a permanent column, so it starts
// collapsed there — otherwise the first paint on a phone is the sider
// eating the whole screen before anyone touches the toggle.
const MOBILE_BREAKPOINT = 768
const isMobileViewport = () => typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT

function App() {
  const [activePage, setActivePage] = useState('monitor')
  const [collapsed, setCollapsed] = useState(isMobileViewport)
  const { token } = theme.useToken()

  useEffect(() => {
    const handleResize = () => {
      if (isMobileViewport()) {
        setCollapsed(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleNavigate = (key: string) => {
    setActivePage(key)
    // On the mobile overlay layout, picking a page should close the drawer
    // too — on desktop this only ever runs if the sider was already open.
    if (isMobileViewport()) {
      setCollapsed(true)
    }
  }

  const renderPage = () => {
    switch (activePage) {
      case 'prescribe':
        return <PrescribeMedicinePage />
      case 'prescription':
        return <PrescriptionPage />
      case 'process':
        return <ProcessTrackingPage />
      case 'inventory':
        return <MachineInventoryPage />
      case 'machine-sim':
        return <MachineSimPage />
      case 'cobot-task':
        return <CobotTaskPage />
      case 'pharmacist-recheck':
        return <PharmacistRecheckPage />
      case 'query-basket':
        return <QueryBasketPage />
      case 'packaged-pouches':
        return <PackagedPouchesPage />
      case 'add-medicine':
        return <AddMedicinePage />
      case 'add-department':
        return <AddDepartmentPage />
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
        {/* Off-canvas backdrop for the mobile drawer layout — only rendered
            (and only intercepts clicks) once the sider is open, and only
            shown at all under the @media block in App.css. */}
        <div
          className={`app-sider-backdrop ${collapsed ? '' : 'app-sider-backdrop--visible'}`}
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
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
            onClick={({ key }) => handleNavigate(key)}
            items={[
              { key: 'monitor', icon: <DashboardOutlined />, label: 'Monitor Queue' },
              { key: 'prescribe', icon: <FormOutlined />, label: 'Prescribe Medicine' },
              { key: 'prescription', icon: <ExperimentOutlined />, label: 'Prescription Managements' },
              { key: 'process', icon: <AuditOutlined />, label: 'Process Tracking' },
              { key: 'inventory', icon: <ToolOutlined />, label: 'Machine Inventory' },
              { key: 'machine-sim', icon: <ApiOutlined />, label: 'Machine Sim' },
              { key: 'cobot-task', icon: <RobotOutlined />, label: 'COBOT Task Management' },
              { key: 'pharmacist-recheck', icon: <SafetyCertificateOutlined />, label: 'Pharmacist Recheck' },
              { key: 'query-basket', icon: <BulbOutlined />, label: 'Query Basket' },
              { key: 'packaged-pouches', icon: <InboxOutlined />, label: 'Packaged Pouches (NZP360)' },
              { key: 'add-medicine', icon: <MedicineBoxOutlined />, label: 'Add Medicine to Machine' },
              { key: 'add-department', icon: <ApartmentOutlined />, label: 'Add Department' },
            ]}
            style={{ background: 'transparent', border: 'none', color: '#fff' }}
          />
        </Sider>

        <Layout>
          <Header className="app-header" style={{ background: token.colorBgContainer }}>
            {/* Lives outside the sider so it's still reachable once the
                sider itself is off-screen on mobile — see @media block in
                App.css for when this is actually visible. */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed((value) => !value)}
              className="mobile-menu-toggle"
            />
            <div>
              <Text type="secondary">Clinical Operations</Text>
              <Title level={3} style={{ margin: '4px 0 0' }}>
                {activePage === 'monitor' && 'Monitor Queue'}
                {activePage === 'prescribe' && 'Prescribe Medicine'}
                {activePage === 'prescription' && 'Prescription Managements'}
                {activePage === 'process' && 'Process Tracking'}
                {activePage === 'inventory' && 'Machine Inventory'}
                {activePage === 'machine-sim' && 'Machine Sim'}
                {activePage === 'add-medicine' && 'Add Medicine to Machine'}
                {activePage === 'add-department' && 'Add Department'}
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
